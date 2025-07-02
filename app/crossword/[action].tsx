import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { GameState } from "~/types/crossword";
import { CrosswordState, getDifficultyFromLevel, pickShuffledWords } from "~/lib/utils";
import words from "~/data/crossword-words.json"
import CrosswordV2 from "~/components/crossword/crosswordV2";
import Modal from 'react-native-modal';
import { debounce } from "lodash";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Confetti } from 'react-native-fast-confetti';

const initialState: GameState = {
  id: Date.now(),
  level: 1,
  correctWords: [],
  mistakesCount: 0,
  attempts: 0,
  guessingWords: [],
  timeStart: Date.now(),
  timeEnd: null,
  cellsValue: {},
  lastDateModified: new Date(),
}

export default function Crossword() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action: 'continue' | 'new_game' | 'new_level' }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationAnswer, setConfirmationAnswer] = useState<null | 'yes' | 'no'>(null);
  const [gameIsFinished, setGameIsFinished] = useState(false);

  const debounceSaveState = useMemo(() => 
    debounce((newGameState: GameState) => {
      const orientationAvailableWords = newGameState.guessingWords.filter(
        (word) => 
          word.orientation !== 'none'
      );

      if (orientationAvailableWords.length === newGameState.correctWords.length) {
        newGameState.level += 1;
        newGameState.timeEnd = Date.now();
        setGameIsFinished(true);
      }

      setGameState(newGameState);

      CrosswordState.saveState(newGameState)
        .catch(console.log);
    }, 500)
  , []);

  useEffect(() => {
    (async () => {
      const previousState = await CrosswordState.loadState();

      if (action === 'continue' && previousState) {
        setGameState(previousState);

        const orientationAvailableWords = previousState.guessingWords.filter(
          (word) => 
            word.orientation !== 'none'
        );

        if (orientationAvailableWords.length === previousState.correctWords.length) {
          setGameIsFinished(true);
        }

        return;
      }

      if (previousState && action === 'new_level') {
        const newState = {
          ...initialState,
          level: previousState.level,
          guessingWords: pickShuffledWords<{ clue: string, answer: string, orientation?: string }>(
            words,
            getDifficultyFromLevel(previousState.level)
          )
        };

        setGameState(newState as any);
        await CrosswordState.saveState(newState as any);
        return;
      }

      if (action === 'new_game') {
        if (previousState && !needsConfirmation && !confirmationAnswer) {
          setNeedsConfirmation(true);

          return;
        }

        if (previousState && needsConfirmation && confirmationAnswer === 'yes') {
          const currentLevel = previousState?.level ?? initialState.level ?? 1;
  
          const newState = {
            ...initialState,
            level: currentLevel,
            guessingWords: pickShuffledWords<{ clue: string, answer: string, orientation?: string }>(
              words,
              getDifficultyFromLevel(currentLevel)
            )
          };
  
          setGameState(newState as any);
          setNeedsConfirmation(false);
          await CrosswordState.saveState(newState as any);

          return;
        }

        if (!previousState) {
          const newState = {
            ...initialState,
            level: 1,
            guessingWords: pickShuffledWords<{ clue: string, answer: string, orientation?: string }>(
              words,
              getDifficultyFromLevel(1)
            )
          };

          setGameState(newState as any);
          await CrosswordState.saveState(newState as any);
          return;
        }

        if (needsConfirmation && confirmationAnswer === 'no') {
          setNeedsConfirmation(false);
          router.back();
        }
      }
    })();
  }, [action, needsConfirmation, confirmationAnswer]);

  // console.log('Game State:', gameState);
  return (
    <View className="w-full h-full">
      <Modal isVisible={needsConfirmation}>
        <View className="w-[100%] h-fit p-5 rounded-xl border border-1 border-stone-300 bg-white">
          <Text>Proceeding will clear previous progress, are you sure?</Text>
          <View className="w-full h-fit flex flex-row justify-end">
            <Button
              variant="ghost"
              onPress={() => setConfirmationAnswer('yes')}
            >
              <Text className="text-red">Yes</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => setConfirmationAnswer('no')}
            >
              <Text>No</Text>
            </Button>
          </View>
        </View>
      </Modal>
      
      {/* Next level modal */}
      <Modal isVisible={gameIsFinished}>
        {gameIsFinished && <Confetti/>}
        <View className="w-[100%] h-fit p-5 rounded-xl border border-1 border-stone-300 bg-white">
          <Text className="font-bold text-2xl text-center text-stone-900">Congratulations on finishing the game!</Text>
          <View className="flex flex-col p-5 border-t mt-5 border-stone-200">
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">Attempts</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">
                  {gameState?.attempts}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">Mistakes</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">
                  {gameState?.mistakesCount}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">Time (Sec)</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold text-orange-600">
                  {gameState?.timeEnd && gameState.timeStart && 
                  Math.floor(new Date(gameState.timeEnd - gameState.timeStart).getTime() / 1000)}
                </Text>
              </View>
            </View>
          </View>
          <View className="w-full h-fit">
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push({
                pathname: '/crossword/[action]',
                params: { action: 'new_level' }
              })}
            >
              <Text className="text-slate-500">NEXT LEVEL</Text>
            </Button>
          </View>
        </View>
      </Modal>

      <View className="p-2 flex justify-center items-center">
        <Text className="font-bold text-slate-500">LEVEL: {gameState?.level}</Text>
      </View>
      {gameState?.guessingWords?.length ? (
        <CrosswordV2
          gameState={gameState}
          onGameStateUpdate={debounceSaveState}
        />
      ) : null}
    </View>
  );
}