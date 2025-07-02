import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { generateLayout } from 'crossword-layout-generator';
import { NativeSyntheticEvent, StyleSheet, Text, TextInputChangeEventData, TextInputKeyPressEventData, Animated, Easing, View } from 'react-native';
import { debounce, groupBy } from 'lodash';
// @ts-ignore
import Elevations from 'react-native-elevation';
import {
  Gesture,
  TextInput,
  GestureDetector
} from 'react-native-gesture-handler';
import { CrosswordLayout, GuessWord, CrosswordResult, WordsGroup, PositionKey, CellDirection } from '~/types/crossword';
import { getPositionKey, isAdjacent } from '~/lib/utils';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CrosswordTableProps {
  words: Pick<CrosswordLayout['result'][number], 'clue' | 'answer'>[];
  onGuess: (guess: GuessWord, isCorrect: boolean) => void;
}

export function Crossword(props: CrosswordTableProps) {
  const [positionGuess, setPositionGuess] = useState<Record<string, string>>({});
  const [positionsToCheck, setPositionsToCheck] = useState<Record<string, Set<string>>>({});
  const [checkResult, setCheckResult] = useState<Record<string, boolean>>({});
  const [correctWordPositions, setCorrectWordPositions] = useState<Set<number>>(new Set<number>());
  
  const [currentCorrectWordCells, setCurrentCorrectWordCells] = useState<Set<string>>(new Set<string>());
  const [currentIncorrectWordCells, setCurrentIncorrectWordCells] = useState<Set<string>>(new Set<string>());
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  const correctWordCells = useRef(new Set<string>());
  const cellRefs = useRef<Record<string, TextInput>>({});
  const currentWordToGuess = useRef<CrosswordResult | null>(null);

  const layout: CrosswordLayout = useMemo(() => generateLayout(props.words), [props.words]);
  const groupedWords: WordsGroup = useMemo(() => groupBy(layout.result, 'orientation') as WordsGroup, [layout.result]);

  // Animation-related state
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const cellElevations = useRef<Record<string, Animated.Value>>({}).current;

  const shakeInterpolation = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10]
  });

  const getElevatedStyle = (key: string) => {
    const anim = cellElevations[key];
    return {
      ...Elevations.interpolate(anim, {
        inputRange: [0, 10],
        outputRange: [0, 10],
      }),
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: 5,
    };
  };

  const incorrectAnswerStyle = useMemo(() => ({
    transform: [{ translateX: shakeInterpolation }]
  }), [shakeInterpolation]);

  const runElevate = (positions: string[]) => {
    const animations = positions.map((positionKey) => {
      const anim = cellElevations[positionKey];
      if (!anim) return;

      return Animated.sequence([
        Animated.timing(anim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]);
    }).filter(Boolean);

    Animated.stagger(100, animations as Animated.CompositeAnimation[]).start();
  };

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  const [
    rootPosition,
    correctLetterPerCell,
    wordsData,
  ] = useMemo(() => {
    const adjacents: Record<PositionKey, Set<PositionKey>> = {};
    const answerPerCell: Record<PositionKey, string> = {};
    const data: Record<PositionKey, CrosswordResult[]> = {};

    layout.result.forEach((res) => {
      const { startx, starty, answer, orientation } = res;
      const positionKey = `${startx}-${starty}`;

      if (!data[positionKey]) {
        data[positionKey] = [res];
      } else {
        data[positionKey].push(res);
      }

      if (!adjacents[positionKey]) {
        adjacents[positionKey] = new Set([positionKey]);
      } else {
        adjacents[positionKey].add(positionKey);
      }

      answerPerCell[positionKey] = answer.at(0)!.toLocaleUpperCase();

      /**
       * Finding the adjacent cells based on the orientation
       * If the orientation is 'down', we fill the cells vertically.
       * If the orientation is 'across', we fill the cells horizontally.
       */
      if (orientation === 'down') {
        for (let i = 1; i < answer.length; i++) {
          const downPositionKey = `${startx}-${starty + i}`;

          if (adjacents[downPositionKey]) {
            // If the down position already exists, we add the current position to its adjacents
            adjacents[downPositionKey].add(positionKey);
          } else {
            // If the down position does not exist, we create a new entry
            adjacents[downPositionKey] = new Set([positionKey]);
          }

          answerPerCell[downPositionKey] = answer[i].toLocaleUpperCase();;
        }
      } else {
        for (let i = 1; i < answer.length; i++) {
          const acrossPositionKey = `${startx + i}-${starty}`;
          if (adjacents[acrossPositionKey]) {
            // If the across position already exists, we add the current position to its adjacents
            adjacents[acrossPositionKey].add(positionKey);
          } else {
            // If the across position does not exist, we create a new entry
            adjacents[acrossPositionKey] = new Set([positionKey]);
          }

          answerPerCell[acrossPositionKey] = answer[i].toLocaleUpperCase();;
        }
      }
    });

    return [adjacents, answerPerCell, data];
  }, [layout.result]);

  const getJumpToPosition = useCallback((
    positionKey: string,
    movement: 'forward' | 'backward' = 'forward'
  ): CellDirection => {
    if (!positionKey) return {};

    const [startx, starty] = positionKey.split('-').map(Number);
    
    if (movement === 'forward') {
      const right = `${startx + 1}-${starty}`;
      const down = `${startx}-${starty + 1}`;
      
      return {
        right: correctWordCells.current.has(right) ? getJumpToPosition(right, movement)?.right : right,
        down: correctWordCells.current.has(down) ? getJumpToPosition(down, movement)?.down : down,
      };
    } else {
      const left = `${startx - 1}-${starty}`;
      const up = `${startx}-${starty - 1}`;

      return {
        left: correctWordCells.current.has(left) ? getJumpToPosition(left, movement)?.left : left,
        up: correctWordCells.current.has(up) ? getJumpToPosition(up, movement)?.up : up,
      }
    }
  }, [correctWordCells]);

  const tapHandler = async (tapCount: number, positionKey: string, wordData: CrosswordResult[] = []) => {
    // Not a root position but has a root parent position.
    const notBelongToRootPositions = !wordData.length && rootPosition[positionKey];

    if (notBelongToRootPositions) {
      const rootPositions = Array.from(rootPosition[positionKey]);

      const wordToGuess = currentWordToGuess.current;
      const hasSingleParent = rootPositions.length === 1;
      const firstParent = rootPositions[0];
      const secondParent = rootPositions[1]; // Could be undefined

      const firstParentFirstWord = wordsData[firstParent][0];
      const secondParentFirstWord = wordsData[secondParent ?? firstParent][0];

      /**
       * ============
       *    ONE TAP
       * ============
       * 
       * if no current word to guess then, pick the first
       * root parent.
       * 
       * if there is a current word to guess, then check if
       * the selected cell is adjacent. If adjacent then
       * ignore, else make it the current word to guess.
       */
      if (tapCount === 1 && firstParentFirstWord) {
        if (wordToGuess) {
          const wordToGuessPositionKey = getPositionKey(wordToGuess);

          if (
            isAdjacent(wordToGuessPositionKey, firstParent) ||
            (secondParent && isAdjacent(wordToGuessPositionKey, secondParent))
          ) return;
        }

        currentWordToGuess.current = firstParentFirstWord;
      } 

      /**
       * ============
       *  DOUBLE TAP
       * ============
       * 
       * If ony has single parent, then assign the current
       * word to guess to the parent's assigned word.
       * 
       * If 2 parents then reassign the current word to guess
       * in alternating pattern.
       * 
       */
      if (tapCount === 2) {
        if (!wordToGuess) return;

        if (hasSingleParent) {
          currentWordToGuess.current = firstParentFirstWord;
        } else {
          if (wordToGuess.answer === firstParentFirstWord.answer) {
            currentWordToGuess.current = secondParentFirstWord;
          } else {
            currentWordToGuess.current = firstParentFirstWord;
          }
        }
      }
    } else {
      const _wordsData = wordsData[positionKey];

      if (!_wordsData.length) return;
      
      if (tapCount === 1) {
        currentWordToGuess.current = _wordsData.at(0)!;
      } else if (tapCount === 2) {
        currentWordToGuess.current = _wordsData.at(1)! ?? _wordsData.at(0)!;
      }
    }

    const currentWordGuessing = currentWordToGuess.current;

    // Collecting all cells to be highlighted
    if (currentWordGuessing) {
      const positionsToHighlight = [];
      
      if (currentWordGuessing.orientation === 'across') {
        for (let i = 0; i < currentWordGuessing.answer.length; i++) {
          positionsToHighlight.push(`${currentWordGuessing.startx + i}-${currentWordGuessing.starty}`);            
        }

      }

      if (currentWordGuessing.orientation === 'down') {
        for (let i = 0; i < currentWordGuessing.answer.length; i++) {
          positionsToHighlight.push(`${currentWordGuessing.startx}-${currentWordGuessing.starty + i}`);            
        }
      }

      setHighlightedFields(new Set(positionsToHighlight));
    }
  }

  const oneTap = (positionKey: string, wordData: CrosswordResult[]) => 
    Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => tapHandler(1, positionKey, wordData))
    .runOnJS(true);

  const doubleTap = (positionKey: string, wordData: CrosswordResult[]) => 
    Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => tapHandler(2, positionKey, wordData))
    .runOnJS(true);

  const gesture = (positionKey: string, wordData: CrosswordResult[]) => 
    Gesture.Exclusive(
      doubleTap(positionKey, wordData),
      oneTap(positionKey, wordData),
    );

  /**
   * Debounce function to validate the guesses after a delay.
   * It checks if the guessed letters match the correct letters for each word position.
   * If the guess is correct, it updates the check result and calls the onGuess callback
   * with the guessed word and its position.
   */
  const debounceValidation = useMemo(() => 
    debounce(async () => {
      const isInCorrectWordPositions = (value: [string, Set<string>]) => !correctWordCells.current.has(value[0]);
      const filteredPositionsToCheck = Object.entries(positionsToCheck).filter(isInCorrectWordPositions)

      for (const [position, wordsPosition] of filteredPositionsToCheck) {
        const words = wordsData[position];

        if (!words) continue;

        for (const data of words) {
          if (wordsPosition.size < data.answer.length) continue;
  
          const startx = data.startx;
          const starty = data.starty;
          let correctLetters = 0;
  
          if (data.orientation === 'down') {
            for (let i = 0; i < data.answer.length; i++) {
              const downPositionKey = `${startx}-${starty + i}`;
              const guess = positionGuess[downPositionKey];
              const isCorrect = guess === correctLetterPerCell[downPositionKey].toUpperCase();
  
              if (!isCorrect) break;
  
              correctLetters++;
            }
          } else {
            for (let i = 0; i < data.answer.length; i++) {
              const acrossPositionKey = `${startx + i}-${starty}`;
              const guess = positionGuess[acrossPositionKey];
              const isCorrect = guess === correctLetterPerCell[acrossPositionKey].toUpperCase();
  
              if (!isCorrect) break;
  
              correctLetters++;
            }
          }
  
          const isAnswerCorrect = correctLetters === data.answer.length;
  
          setCurrentIncorrectWordCells(() => new Set());
  
          if (isAnswerCorrect) {
            correctWordCells.current = new Set([
              ...Array.from(correctWordCells.current),
              ...Array.from(wordsPosition),
            ]);
  
            setCorrectWordPositions((prev) => new Set([
              ...Array.from(prev),
              data.position,
            ]));
  
            const wordCellKeys = Array.from(wordsPosition);
            setCurrentCorrectWordCells(new Set(wordCellKeys));
            runElevate(wordCellKeys);
  
            setTimeout(() => {
              setCurrentCorrectWordCells(() => new Set());
            }, 5000);
          } else {
            setCurrentIncorrectWordCells((prev) => {
              const newSet = new Set(prev);
              wordsPosition.forEach(pos => newSet.add(pos));
              return newSet;
            });
            runShake();
          }
  
          setCheckResult(prev => ({
            ...prev,
            [position]: isAnswerCorrect,
          }));
  
          props.onGuess({
            wordPosition: data.position,
            guessWord: data.answer,
          }, isAnswerCorrect);
        }
      }
    }, 500)
  , [positionsToCheck, wordsData, correctWordPositions]);

  const onChangeText = (
    positionKey: string
  ) => (
    e: NativeSyntheticEvent<TextInputChangeEventData>
  ) => {
    e.preventDefault();
    if (!currentWordToGuess.current) return;

    const text = e.nativeEvent.text;

    // Alpha characters only, and allow backspace
    const isAlpha = /^[A-Za-z]+?$/.test(text);
    const isBackspace = !text.length;

    let nextWordCellPosition: string | null = null;

    const {
      right: goRight,
      down: goDown,
    } = getJumpToPosition(positionKey, 'forward');

    /**
     * If the word data is not found, it means this is not the starting point of a word.
     * We can check the adjacent dictionary to find the position of the word.
     */
    if (!isBackspace) {
      if (currentWordToGuess.current.orientation === 'across') {
        nextWordCellPosition = goRight!;
      } else {
        nextWordCellPosition = goDown!;
      }
    }

    setPositionsToCheck(prev => {
      const rootPositions = Array.from(rootPosition[positionKey]);
      if (!rootPositions) return prev;

      const newPrev = {
        ...prev,
      };

      for (const adjacentPosition of rootPositions) {
        if (prev[adjacentPosition] === undefined) {
          prev[adjacentPosition] = new Set();
        }

        const next = new Set(prev[adjacentPosition]);

        if (isBackspace) {
          // If backspace, remove the position from the set
          next.delete(positionKey);
        } else if (isAlpha) {
          // If alpha character, add the position to the set
          next.add(positionKey);
        }

        newPrev[adjacentPosition] = next;
      }

      return newPrev;
    });

    setPositionGuess((prev) => ({
      ...prev,
      [positionKey]: isAlpha ? text[text.length - 1].toUpperCase() : '',
    }));

    if (nextWordCellPosition && cellRefs.current[nextWordCellPosition]) {
      cellRefs.current[nextWordCellPosition]?.focus();
    }
  }

  const handleBackSpace = useCallback((positionKey: string) => {
    let nextWordCellPosition: string | null = null;

    return (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (!currentWordToGuess.current) return;

      const key = e.nativeEvent.key;

      if (key === 'Backspace') {
        if (positionGuess[positionKey] || positionGuess[positionKey]?.length) return; 

        const {
          left: goLeft,
          up: goUp,
        } = getJumpToPosition(positionKey, 'backward');

        e.stopPropagation();
        e.preventDefault();

        if (currentWordToGuess.current.orientation === 'across') {
          nextWordCellPosition = goLeft!;
        } else {
          nextWordCellPosition = goUp!;
        }

        if (nextWordCellPosition && cellRefs.current[nextWordCellPosition]) {
          cellRefs.current[nextWordCellPosition]?.focus();
        }
      }
    }
  }, [positionGuess, getJumpToPosition]);

  useEffect(() => {
    debounceValidation();

    return () => {
      debounceValidation.cancel();
    };
  }, [debounceValidation]);

  return (
    <View>
      <View className='w-full flex justify-center items-center p-10 bg-slate-100'>
        {layout.table.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, cellIndex) => {
              const starty = rowIndex + 1;
              const startx = cellIndex + 1;

              const isBlankCell = cell === '-';
              const positionKey = `${startx}-${starty}`;
              const isCurrentGuessed = currentCorrectWordCells.has(positionKey);
              const hasBeenGuessed = correctWordCells.current.has(positionKey);
              const willHighlight = highlightedFields.has(positionKey);

              const wordData = wordsData[positionKey];
              const wordNumbers = wordData?.map(({ position }) => position);

              if (!cellElevations[positionKey]) {
                cellElevations[positionKey] = new Animated.Value(0);
              }

              return (
                <View
                  key={`${rowIndex}-${cellIndex}`}
                  style={styles.cellContainer}
                >
                  {/* Word Position */}
                  {wordNumbers !== undefined ?
                  <View style={styles.smallDigitContainer}>
                    {wordNumbers.map(position => (
                      <Text key={`word-position-${position}`} style={styles.smallDigit}>
                        {position}
                      </Text>
                    ))}
                  </View>
                  : null}

                  {/* Cell */}
                  {!isBlankCell
                  ? (
                  <AnimatedView
                    style={[
                      currentIncorrectWordCells.has(positionKey) && incorrectAnswerStyle,
                    ]}
                  >
                    <GestureDetector gesture={gesture(positionKey, wordData)}>
                      <AnimatedTextInput
                        ref={(ref: any) => {
                          if (ref) cellRefs.current[positionKey] = ref;
                        }}
                        style={[
                          styles.cell,
                          willHighlight && styles.highlightedCell,
                          isCurrentGuessed && getElevatedStyle(positionKey),
                          hasBeenGuessed && styles.correctCell,
                        ]}
                        editable={!hasBeenGuessed}
                        value={positionGuess[positionKey]}
                        onChange={onChangeText(positionKey)}
                        onKeyPress={handleBackSpace(positionKey)}
                      />
                    </GestureDetector>
                  </AnimatedView>
                  )
                  : (
                  <View
                    style={[
                      styles.cell,
                      styles.staticCell
                    ]}
                  />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className='p-3'>
        {groupedWords?.across?.length && (
          <View style={styles.questionsContainer}>
            <View style={styles.headingContainer}>
              <Text style={styles.headingText}>Across</Text>
            </View>
            {groupedWords.across.map((word) => (
              <Text
                key={word.position}
                style={[
                  styles.questionText,
                  correctWordPositions.has(word.position) && styles.guessedQuestionText
                ]}
              >
                {word.position}. {word.clue}
              </Text>
            ))}
          </View>
        )}

        {groupedWords?.down?.length && (
          <View style={styles.questionsContainer}>
            <View style={styles.headingContainer}>
              <Text style={styles.headingText}>Down</Text>
            </View>
            {groupedWords.down.map((word) => (
              <Text
                key={word.position}
                style={[
                  styles.questionText,
                  correctWordPositions.has(word.position) && styles.guessedQuestionText
                ]}
              >
                {word.position}. {word.clue}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	row: {
		flexDirection: 'row',
	},
	cellContainer: {
		position: 'relative',
    flexShrink: 0,
	},
	cell: {
		borderWidth: 1,
		margin: 1,
		borderColor: '#f47c0b',
    borderRadius: 5,
		width: 30,
		height: 33,
    lineHeight: 1,
    padding: 0,
		textAlign: 'center',
	},
	staticCell: {
		borderColor: 'transparent',
    borderWidth: 0,
		color: 'white',
	},
  correctCell: {
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#f47c0b',
  },
  highlightedCell: {
    borderWidth: 2,
  },
	smallDigitContainer: {
		position: 'absolute',
		top: 2,
		left: 2,
    display: 'flex',
    flexDirection: 'row',
    gap: 2
	},
  smallDigit: {
		top: 2,
		left: 2,
		fontSize: 10,
		fontWeight: 'bold',
	},
	questionsContainer: {
		justifyContent: 'space-between',
		marginBottom: 10,
		padding: 10,
	},
	questionText: {
		fontSize: 16,
    color: 'rgba(0, 0, 0, 0.8)'
	},
  guessedQuestionText: {
    textDecorationLine: 'line-through',
  },
	headingContainer: {
		marginTop: 10,
		marginBottom: 5,
	},
	headingText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#000',
		textAlign: 'center',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 20,
		marginHorizontal: 10,
	},
	button: {
		flex: 1, // Ensure equal width for both buttons
	},
	gap: {
		width: 10, // Adjust the width as needed for the desired gap
	},
});