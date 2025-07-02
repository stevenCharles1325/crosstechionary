import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CrosswordLayout, GameState, WordsGroup } from "~/types/crossword";
// @ts-ignore
import { generateLayout } from 'crossword-layout-generator';
import { intersectSets, positionOrientationLoop } from "~/lib/utils";
import { View, StyleSheet, NativeSyntheticEvent, TextInputChangeEventData, TextInputKeyPressEventData, Text } from "react-native";
import {
  Gesture,
  TextInput,
} from 'react-native-gesture-handler';
import Cycled from 'cycled';
import { groupBy, isEmpty, once } from "lodash";
import { CrossWordCell } from "./crosswordCell";
import { ScrollView } from 'react-native-gesture-handler';

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
  const cellsRef = useRef<Record<string, TextInput>>({});

  const consumeGameState = useRef(once((state: GameState) => {
    if (state.correctWords?.length) {
      const detectedCorrectCells = state.correctWords.flatMap((data) => {
        const cellInputs: Record<string, string> = {};

        for (let i = 1; i < data.word.length; i++) {
          cellInputs[data.cells[i]] = data.word[i].toUpperCase();
        }

        setCellValue((prev) => ({
          ...prev,
          ...cellInputs,
        }));

        return data.cells;
      });

      setCorrectCells(new Set(detectedCorrectCells));
    }

    if (!isEmpty(state.cellsValue)) {
      setCellValue((prev) => ({
        ...prev,
        ...state.cellsValue,
      }));
    }
  }));

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

    if (!oneTapWord) return;

    const cellsArray = Array.from(oneTapWord.cells);
    const startIndex = cellsArray.indexOf(positionKey);
    cellPointer.current = new Cycled(cellsArray);
    cellPointer.current.index = startIndex;

    setHighlightedCells(oneTapWord.cells);
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

  const debounceAnswerCheck = useMemo(() => 
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

  const onChangeText = useCallback((
    positionKey: string,
  ) => (
    e: NativeSyntheticEvent<TextInputChangeEventData>
  ) => {
    if (!guessingWord.oneTapWord) return;
    
    e.preventDefault();

    const text = e.nativeEvent.text;

    // Alpha characters only, and allow backspace
    const isAlpha = /^[A-Za-z-]+?$/.test(text);
    const isBackspace = !text.length;

    setCellValue((prev) => ({
      ...prev,
      [positionKey]: isAlpha ? text : '',
    }));

    const updatedCellValue = {
      ...cellValue,
      [positionKey]: isAlpha ? text : '',
    }

    let isAnswerCorrect = null;
    let newState: GameState | undefined = gameState;

    if (!isBackspace) {
      const checkResult = debounceAnswerCheck(
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

    if (!isBackspace) {
      if (!cellPointer.current) return;
      let nextPosition = cellPointer.current.peek(1);

      const currentPosition = cellPointer.current.current();
      const isLastElement = 
        cellPointer.current.indexOf(currentPosition) === cellPointer.current.length - 1;

      if (isLastElement && currentPosition) return;

      if (nextPosition) {
        if (correctCells.has(nextPosition)) {
          nextPosition = cellPointer.current.step(2);
        } else {
          cellPointer.current.next();
        }

        cellsRef.current[nextPosition].focus();
      }
    }
  }, [gameState, guessingWord, debounceAnswerCheck, cellValue, onGameStateUpdate, correctCells]);

  const handleBackSpace = useCallback((
    positionKey: string
  ) => (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    const key = e.nativeEvent.key;

    if (key === 'Backspace' && !cellValue[positionKey]?.length) {
      e.stopPropagation();
      e.preventDefault();

      if (!cellPointer.current) return;
      let nextPosition = cellPointer.current.peek(-1);

      const currentPosition = cellPointer.current.current();
      const isFirstElement = cellPointer.current.indexOf(currentPosition) === 0;

      if (isFirstElement && currentPosition) return;
      if (nextPosition) {
        if (correctCells.has(nextPosition)) {
          nextPosition = cellPointer.current.step(-2);
        } else {
          cellPointer.current.previous();
        }

        cellsRef.current[nextPosition].focus();
      }
    }
  }, [cellValue, correctCells]);

  /**
   * Filling the current state with the saved game state.
   */
  useEffect(() => {
    if (gameState) consumeGameState.current(gameState);
  }, [gameState]);

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
    return layout.table.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((cell, cellIndex) => {
          const starty = rowIndex + 1;
          const startx = cellIndex + 1;
          const positionKey = `${startx}-${starty}`;

          return (
            <CrossWordCell
              key={positionKey}
              cell={cell}
              cellsRef={cellsRef}
              rowIndex={rowIndex}
              cellIndex={cellIndex}
              positionKey={positionKey}
              value={cellValue[positionKey]}
              hasBeenGuessed={correctCells.has(positionKey)}
              isEditable={!correctCells.has(positionKey)}
              shouldShake={incorrectCells.has(positionKey)}
              wordPositions={wordOrder[positionKey]}
              shouldHighlight={highlightedCells.has(positionKey)}
              gesture={gesture}
              onChange={onChangeText}
              onKeyPress={handleBackSpace}
            />
          );
        })}
      </View>
    ));
  }, [
    layout,
    cellValue,
    wordOrder,
    correctCells,
    incorrectCells,
    highlightedCells,
    gesture,
    onChangeText,
    handleBackSpace,
  ]);

  return (
    <View className="flex-1">
      <ScrollView
        style={{ maxHeight: 400 }} // limit max height so clues can be visible too
        nestedScrollEnabled
      >
        <ScrollView
          horizontal
          nestedScrollEnabled
          contentContainerStyle={{
            alignItems: 'flex-start',
          }}
          className="bg-slate-200"
        >
          <View className="w-full h-fit p-10 bg-slate-200">
            {cells}
          </View>
        </ScrollView>
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        <View className="w-full px-5">
          {groupedWords?.across?.length && (
            <View style={styles.questionsContainer}>
              <View style={styles.headingContainer}>
                <Text style={styles.headingText} className="dark:text-stone-50 text-stone-900">Across</Text>
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
                <Text style={styles.headingText} className="dark:text-stone-50 text-stone-900">Down</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
	},
	staticCell: {
		borderColor: 'transparent',
    borderWidth: 0,
		color: 'white',
	},
	questionsContainer: {
		justifyContent: 'space-between',
		marginBottom: 10,
		padding: 10,
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
		fontSize: 18,
		fontWeight: 'bold',
		textAlign: 'center',
	},
});