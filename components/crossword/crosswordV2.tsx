import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CrosswordLayout, GameState, WordsGroup } from "~/types/crossword";
// @ts-ignore
import { generateLayout } from 'crossword-layout-generator';
import { intersectSets, positionOrientationLoop } from "~/lib/utils";
import { View, StyleSheet, NativeSyntheticEvent, TextInputChangeEventData, TextInputKeyPressEventData, Text, ImageBackground, PanResponder } from "react-native";
import {
  Gesture,
  TextInput,
} from 'react-native-gesture-handler';
import Cycled from 'cycled';
import { debounce, groupBy, isEmpty, once } from "lodash";
import { CrossWordCell } from "./crosswordCell";
import { ScrollView } from 'react-native-gesture-handler';
import { appColor } from "~/lib/constants";
import { CrosswordCellRow } from "./crosswordCellRow";
import { Button } from "../ui/button";

type GuessingWord = {
  oneTapWord: {
    word: string;
    cells: Set<string>;
  } | null,
  doubleTapWord: {
    word: string;
    cells: Set<string>;
  } | null;
};
type WordCells = Record<string, Set<string>>;

export interface CrosswordV2Props {
  gameState: GameState;
  onGameStateUpdate: (state: GameState) => void;
}

export default function CrosswordV2 (props: CrosswordV2Props) {
  const { gameState, onGameStateUpdate } = props;

  // temporary states
  const [wordOrder, setWordOrder] = useState<Record<string, number[]>>({});
  const [incorrectCells, setIncorrectCells] = useState<Set<string>>(new Set());
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [correctCells, setCorrectCells] = useState<Set<string>>(new Set());
  const [cellValue, setCellValue] = useState<Record<string, string>>({});
  const [guessingWord, setGuessingWord] = useState<GuessingWord>({
    oneTapWord: null,
    doubleTapWord: null,
  });

  const wordsCellsRef = useRef<WordCells>({});
  const cellPointer = useRef<Cycled<string> | null>(null);
  const cellsRef = useRef<Record<string, TextInput & { value?: string }>>({});

  const [height, setHeight] = useState(200);
  const initialHeight = useRef(height);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const newHeight = initialHeight.current + gesture.dy;
        if (newHeight > 100 && newHeight < 600) {
          setHeight(newHeight);
        }
      },
      onPanResponderRelease: () => {
        initialHeight.current = height;
      },
    })
  ).current;

  const consumeGameState = useRef(once((state: GameState) => {
    if (state.correctWords?.length) {
      const detectedCorrectCells = state.correctWords.flatMap((data) => {
        const cellInputs: Record<string, string> = {};

        for (let i = 1; i < data.word.length; i++) {
          cellInputs[data.cells[i]] = data.word[i].toUpperCase();
        }

        return data.cells;
      });

      setCorrectCells(new Set(detectedCorrectCells));
    }

    if (!isEmpty(state.cellsValue)) {
      Object.entries(state.cellsValue).forEach(([positionKey, value]) => {
        if (!cellsRef.current[positionKey]) return;

        cellsRef.current[positionKey].value = value;
        cellsRef.current[positionKey].setNativeProps({ text: value });
      });

      setCellValue((prev) => ({
        ...prev,
        ...state.cellsValue,
      }));
    }
  })).current;

  const layout: CrosswordLayout = useMemo(() => 
    generateLayout(gameState.guessingWords)
  , [gameState.guessingWords]);
  const groupedWords: WordsGroup = useMemo(() => 
    groupBy(layout.result, 'orientation') as WordsGroup
  , [layout.result]);

  /**
   * Each word should have "Set" of cell
   * position.
   */
  useEffect(() => {
    if (layout) {
      const _wordOrder: Record<string, number[]> = {};

      (async () => {
        const orientationAvailable =  layout.result.filter((result) => 
          result.orientation !== 'none'
        );

        orientationAvailable
          .forEach((result) => {
            const { position, startx, starty } = result;
            const positionKey = `${startx}-${starty}`;
            const cellPositions = new Set<string>();

            positionOrientationLoop(result, (data) => {
              cellPositions.add(data.positionKey)
            });

            if (_wordOrder[positionKey]) {
              _wordOrder[positionKey].push(position);
            } else {
              _wordOrder[positionKey] = [position];
            }

            wordsCellsRef.current[result.answer] = cellPositions;
          });

          setWordOrder(_wordOrder);
      })();
    }
  }, [layout]);

  const oneTapHandler = useCallback(async (positionKey: string) => {
    let oneTapWord: GuessingWord['oneTapWord'] = guessingWord.oneTapWord;
    let doubleTapWord: GuessingWord['doubleTapWord'] = null;

    const wordsCellEntries = Object.entries(wordsCellsRef.current);

    // 1. Get the first word detected
    if (!oneTapWord || (oneTapWord && !oneTapWord.cells.has(positionKey))) {
      for (const [key, value] of wordsCellEntries) {
        if (value.has(positionKey)) {
          oneTapWord = { word: key, cells: value };

          break;
        }
      }
    }

    if (!oneTapWord) return;
    setHighlightedCells(oneTapWord.cells);

    // 2. Get the second word if one of the cell in first word has adjacent word.
    if (oneTapWord?.cells) {
      for (const [key, value] of wordsCellEntries) {
        if (key === oneTapWord.word) continue;
        const common = intersectSets(new Set([positionKey]), value);
        
        if (common.size) {
          doubleTapWord = { word: key, cells: value };
          break;
        }
      }
    }

    const cellsArray = Array.from(oneTapWord.cells);
    const startIndex = cellsArray.indexOf(positionKey);
    cellPointer.current = new Cycled(cellsArray);
    cellPointer.current.index = startIndex;

    setGuessingWord({ oneTapWord, doubleTapWord });
  }, [guessingWord]);

  const doubleTapHandler = useCallback((positionKey: string) => {
    try {
      if (guessingWord.oneTapWord?.cells && guessingWord.doubleTapWord?.cells) {
        const common = intersectSets(guessingWord.oneTapWord.cells, guessingWord.doubleTapWord.cells);
  
        if (!common.size) return;
  
        /**
         * Swap the words if double tapped.
         */
        if (common.size && common.has(positionKey)) {
          let doubleTapWord: GuessingWord['doubleTapWord'] = guessingWord.doubleTapWord;

          const cellsArray = Array.from(doubleTapWord.cells);
          const startIndex = cellsArray.indexOf(positionKey);
          cellPointer.current = new Cycled(cellsArray);
          cellPointer.current.index = startIndex;

          setGuessingWord((prev) => {
            const { oneTapWord: oneTap, doubleTapWord: doubleTap } = prev;
  
            return {
              oneTapWord: doubleTap,
              doubleTapWord: oneTap,
            }
          });

          setHighlightedCells(guessingWord.doubleTapWord.cells);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }, [guessingWord]);

  const oneTap = useCallback((positionKey: string) => 
    Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => oneTapHandler(positionKey))
    .runOnJS(true)
  , [oneTapHandler]);

  const doubleTap = useCallback((positionKey: string) => 
    Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => doubleTapHandler(positionKey))
    .runOnJS(true)
  , [doubleTapHandler]);

  const gesture = useCallback((positionKey: string) => 
    Gesture.Exclusive(
      doubleTap(positionKey),
      oneTap(positionKey),
    )
  , [oneTap, doubleTap]);

  const checkAnswer = useMemo(() => 
    (
      word: string, 
      cells: Set<string>, 
      answers: Record<string, string>, 
      state: GameState
    ): ([boolean, GameState] | undefined)  => {
      let correctGuess = 0;

      const cellArrays = Array.from(cells);

      if (!cellArrays.length) return;

      for (const [index, positionKey] of cellArrays.entries()) {
        if (!answers[positionKey]) return;

        if (answers[positionKey].replaceAll('-', '_') === word[index].toUpperCase()) {
          correctGuess++;
        }
      }

      const isAnswerCorrect = correctGuess === word.length;
      const newState = {
        ...gameState,
        attempts: isAnswerCorrect ? state.attempts : state.attempts + 1,
        mistakesCount: isAnswerCorrect 
          ? state.mistakesCount
          : state.mistakesCount + 1,
        correctWords: isAnswerCorrect
          ? [
            ...state.correctWords,
            { word, cells: cellArrays }
          ]
          : state.correctWords,
      };

      return [
        isAnswerCorrect,
        newState
      ];
    }
  , [gameState, onGameStateUpdate]);

  const debouncedOnChangeHandling = useMemo(() =>
    debounce(() => {
      if (!guessingWord.oneTapWord) return;
    
      const updatedCellValue: typeof cellValue = {
        ...cellValue,
      };

      const cellsArray = Array.from(guessingWord.oneTapWord.cells);
      let fieldWithValueCount = 0;

      for (const positionKey of cellsArray) {
        const cellInput = cellsRef.current[positionKey].value;

        updatedCellValue[positionKey] = cellInput ?? '';

        if (cellInput && cellInput.length) fieldWithValueCount++;
      }

      setCellValue(updatedCellValue);

      let isReadyForChecking = fieldWithValueCount === cellsArray.length;
      let isAnswerCorrect = null;
      let newState: GameState | undefined = gameState;

      if (isReadyForChecking) {
        const checkResult = checkAnswer(
          guessingWord.oneTapWord.word,
          guessingWord.oneTapWord.cells,
          updatedCellValue,
          gameState,
        );
        isAnswerCorrect = checkResult ? checkResult.at(0) : null;
        newState = (checkResult ? checkResult.at(1) : {}) as GameState | undefined;

        if (isAnswerCorrect === false) {
          setIncorrectCells(guessingWord.oneTapWord.cells);
        }

        if (isAnswerCorrect === true) {
          const newCorrectCells = [
            ...Array.from(correctCells),
            ...Array.from(guessingWord.oneTapWord.cells),
          ];

          setCorrectCells(new Set(newCorrectCells));
        }
      }

      onGameStateUpdate({
        ...gameState,
        ...newState,
        cellsValue: updatedCellValue,
      });
    }, 300)
  , [gameState, guessingWord, checkAnswer, cellValue, onGameStateUpdate, correctCells]);

  const onChangeText = useCallback((
    positionKey: string,
  ) => (
    e: NativeSyntheticEvent<TextInputChangeEventData>
  ) => {
    const text = e.nativeEvent.text;
    const isBackspace = !text.length;

    cellsRef.current[positionKey].value = text;
    cellsRef.current[positionKey].setNativeProps({ text });

    debouncedOnChangeHandling();

    const pointer = cellPointer.current;

    if (isBackspace || !pointer) return;
    
    const currentPosition = pointer.current();
    const positionIndex = pointer.indexOf(currentPosition);

    // If last position, then ignore
    if (positionIndex === pointer.length - 1) return;

    let nextPosition = pointer.peek(1);

    if (nextPosition && correctCells.has(nextPosition)) {
      nextPosition = pointer.step(2);
    } else {
      pointer.next();
    }

    cellsRef.current[nextPosition].focus();
  }, [debouncedOnChangeHandling]);

  const handleBackSpace = useCallback((
    positionKey: string
  ) => (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    const key = e.nativeEvent.key;
    const cellValue = cellsRef.current[positionKey]?.value;

    if (key === 'Backspace' && !cellValue?.length) {
      e.stopPropagation();
      e.preventDefault();

      const pointer = cellPointer.current;
      if (!pointer) return;
    
      const currentPosition = pointer.current();
      const positionIndex = pointer.indexOf(currentPosition);

      // If last position, then ignore
      if (positionIndex === 0) return;

      let nextPosition = pointer.peek(-1);

      if (nextPosition && correctCells.has(nextPosition)) {
        nextPosition = pointer.step(-2);
      } else {
        pointer.previous();
      }

      cellsRef.current[nextPosition].focus();
    }
  }, [correctCells]);

  const clearCells = useCallback(async () => {
    const newCellValue: Record<string, string> = {};

    Object.keys(cellValue).forEach((positionKey) => {
      if (correctCells.has(positionKey)) return;

      newCellValue[positionKey] = '';
      cellsRef.current[positionKey].value = '';
      cellsRef.current[positionKey].setNativeProps({ text: '' });
    });

    setCellValue(newCellValue);
    onGameStateUpdate({
      ...gameState,
      cellsValue: newCellValue,
    });
  }, [gameState, cellValue, correctCells]);

  useEffect(() => {
    const timeout = 500;
    let timer1: ReturnType<typeof setTimeout> | null = null;

    if (incorrectCells.size) {
      timer1 = setTimeout(() => setIncorrectCells(new Set()), timeout);
    }

    return () => {
      if (timer1) clearTimeout(timer1);
    }
  }, [incorrectCells]);

  const cells = useMemo(() => {
    if (isEmpty(wordOrder)) return [];

    return layout.table.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((cell, cellIndex) => 
          <CrosswordCellRow
            key={`${rowIndex + 1}-${cellIndex + 1}`}
            cell={cell}
            rowIndex={rowIndex}
            cellsRef={cellsRef}
            cellIndex={cellIndex}
            wordPositions={wordOrder}
            correctCells={correctCells}
            incorrectCells={incorrectCells}
            highlightedCells={highlightedCells}
            gesture={gesture}
            onChange={onChangeText}
            onKeyPress={handleBackSpace}
          />
        )}
      </View>
    ));
  }, [
    layout,
    wordOrder,
    correctCells,
    incorrectCells,
    highlightedCells,
    gesture,
    onChangeText,
    handleBackSpace,
  ]);

  /**
   * Filling the current state with the saved game state.
   */
  useEffect(() => {
    if (gameState && cells.length) {
      consumeGameState(gameState);
    }
  }, [gameState, cells]);

  return (
    <View className="flex-1 bg-[#000]">
      <View style={[styles.resizableBox, { height }]}>
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: appColor.jetBlack }}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              alignItems: 'flex-start',
            }}
            style={{ backgroundColor: 'transparent' }}
          >
            <View className="w-full h-fit p-10" style={{ backgroundColor: appColor.jetBlack }}>
              {cells}
            </View>
          </ScrollView>
        </ScrollView>
        <View className="w-screen h-[3px] flex flex-row justify-center items-center" style={{ backgroundColor: appColor.neonCyanBlue }}>
          <View {...panResponder.panHandlers} className="w-[25px] h-[25px] rounded-full bg-[#fff]" style={{ backgroundColor: appColor.neonCyanBlue }}>
            <Text className="text-center text-sm text-white">^</Text>
          </View>
        </View>
      </View>

      <ScrollView>
        <ImageBackground
          source={require('../../assets/appImages/background-image.png')}
          className="w-full px-5 pb-[100px] pt-[50px]"
        >
          <View className="mb-3 flex flex-row-reverse">
            <Button className="w-[120px] rounded-full" variant="destructive" size="sm" onPress={clearCells}>
              <Text className="text-white">Clear Guesses</Text>
            </Button>
          </View>
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
                    // .has(word.position) && styles.guessedQuestionText
                  ]}
                  className="dark:text-stone-50 text-stone-600 mb-2 text-justify"
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
                    // correctWordPositions.has(word.position) && styles.guessedQuestionText
                  ]}
                  className="dark:text-stone-50 text-stone-600 mb-2 text-justify"
                >
                  {word.position}. {word.clue}
                </Text>
              ))}
            </View>
          )}
        </ImageBackground>
        {/* <View className="w-full px-5">
        </View> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
	},
  resizableBox: {
    width: '100%',
    backgroundColor: '#33C3FF',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
	questionsContainer: {
		justifyContent: 'space-between',
		marginBottom: 10,
		padding: 20,
    backgroundColor: appColor.jetBlack,
    borderWidth: 1,
    borderRadius: 20,
    elevation: 10,
    borderColor: appColor.neonCyanBlue,
	},
	questionText: {
		fontSize: 16,
	},
  guessedQuestionText: {
    textDecorationLine: 'line-through',
  },
	headingContainer: {
		marginTop: 10,
		marginBottom: 5,
	},
	headingText: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
    color: appColor.neonCyanBlue,
	},
});