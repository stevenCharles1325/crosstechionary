import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { GameState } from "~/types/crossword";
import { CrosswordState, getDifficultyFromLevel, pickConnectedWords } from "~/lib/utils";
import words from "~/data/crossword-words.json"
import CrosswordV2 from "~/components/crossword/crosswordV2";
import Modal from 'react-native-modal';
import { debounce } from "lodash";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Confetti } from 'react-native-fast-confetti';
import { appColor } from "~/lib/constants";

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
        newGameState.level = newGameState.level >= 3 ? 3 : newGameState.level + 1;
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
        const level = previousState.level >= 3 ? 3 : previousState.level;

        const newState = {
          ...initialState,
          level,
          guessingWords: pickConnectedWords(
            words,
            getDifficultyFromLevel(level)
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
            guessingWords: pickConnectedWords(
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
            guessingWords: pickConnectedWords(
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

  // const wordsMemo = useMemo(() => gameState?.guessingWords.map((data) => `${data.orientation}: ${data.answer}`), [gameState]);
  // useEffect(() => {
  //   console.log('WORDS: ', wordsMemo);
  // }, [wordsMemo]);
  return (
    <View className="w-full h-full">
      <Modal isVisible={needsConfirmation}>
        <View className="w-[100%] h-fit p-5 rounded-xl border border-1" style={{ borderColor: appColor.neonCyanBlue, backgroundColor: appColor.jetBlack }}>
          <Text>Proceeding will clear previous progress, are you sure?</Text>
          <View className="w-full h-fit flex flex-row justify-end">
            <Button
              variant="ghost"
              onPress={() => setConfirmationAnswer('yes')}
            >
              <Text>Yes</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => setConfirmationAnswer('no')}
            >
              <Text style={{ color: appColor.neonCyanBlue }}>No</Text>
            </Button>
          </View>
        </View>
      </Modal>
      
      {/* Next level modal */}
      <Modal isVisible={gameIsFinished}>
        {gameIsFinished && <Confetti/>}
        <View className="w-[100%] h-fit p-5 rounded-xl border border-1" style={{ borderColor: appColor.neonCyanBlue, backgroundColor: appColor.jetBlack }}>
          <Text className="font-bold text-2xl text-center">Congratulations on finishing the game!</Text>
          <View className="flex flex-col p-5 border-t mt-5 border-stone-200">
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>Attempts</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>
                  {gameState?.attempts}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>Mistakes</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>
                  {gameState?.mistakesCount}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-between items-center">
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>Time (Sec)</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-center text-lg font-bold" style={{ color: appColor.neonCyanBlue }}>
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
              <Text style={{ color: appColor.lightBlue }}>NEXT LEVEL</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {gameState?.level ? (
      <View className="p-2 flex justify-center items-center">
        <Text className="text-sm font-bold bg-white rounded rounded-full p-1 px-2" style={{ color: appColor.neonCyanBlue }}>Level {gameState?.level}</Text>
      </View>
      ) : null}

      {gameState?.guessingWords?.length ? (
        <CrosswordV2
          gameState={gameState}
          onGameStateUpdate={debounceSaveState}
        />
      ) : null}
    </View>
  );
}