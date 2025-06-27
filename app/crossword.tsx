import { View } from "react-native";
import { useRouter } from "expo-router";
import { Crossword as CrossWord } from "~/components/crossword";
import { useEffect, useState } from "react";
import { GameState } from "~/types/crossword";
import { CrosswordState, getDifficultyFromLevel, pickShuffledWords } from "~/lib/utils";
import words from "~/data/crossword-words.json"

const initialState: Partial<GameState> = {
  id: Date.now(),
  level: 1,
  correctWords: [],
  mistakesCount: 0,
  timeStart: new Date(),
  filledCells: [],
}

export default function Crossword() {
  const router = useRouter();
  const [gameState, setGameState] = useState<Partial<GameState>>(initialState);

  useEffect(() => {
    (async () => {
      setGameState(
        await CrosswordState.loadState() ?? initialState
      );
    })();
  }, []);

  useEffect(() => {
    if (!gameState?.guessingWords) {
      setGameState((prev) => ({
        ...prev,
        guessingWords: pickShuffledWords(
          words,
          getDifficultyFromLevel(prev.level ?? 1)
        )
      }));
    }
  }, [gameState]);

  return (
    <View className="w-full h-full">
      {gameState.guessingWords ? (
        <CrossWord
          words={gameState.guessingWords ?? []}
          onGuess={(guess, isCorrect) => console.log(guess, isCorrect)}
        />
      ) : null}
    </View>
  );
}