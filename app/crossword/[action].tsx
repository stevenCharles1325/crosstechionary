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

const initialState: GameState = {
  id: Date.now(),
  level: 1,
  correctWords: [],
  mistakesCount: 0,
  attempts: 0,
  guessingWords: [],
  timeStart: new Date(),
  timeEnd: null,
  cellsValue: {},
  lastDateModified: new Date(),
}

export default function Crossword() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action: 'continue' | 'new_game' }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationAnswer, setConfirmationAnswer] = useState<null | 'yes' | 'no'>(null);

  const debounceSaveState = useMemo(() => 
    debounce((newGameState: GameState) => {
      setGameState(newGameState);

      CrosswordState.saveState(newGameState)
        .catch(console.log);
    }, 500)
  , []);

  useEffect(() => {
    (async () => {
      const previousState = await CrosswordState.loadState();

      if (action === 'continue') {
        setGameState(previousState);

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
            guessingWords: pickShuffledWords(
              words,
              getDifficultyFromLevel(currentLevel)
            )
          };
  
          setGameState(newState);
          setNeedsConfirmation(false);
          await CrosswordState.saveState(newState);

          return;
        }

        if (needsConfirmation && confirmationAnswer === 'no') {
          setNeedsConfirmation(false);
          router.back();
        }
      }
    })();
  }, [action, needsConfirmation, confirmationAnswer]);

  console.log('Game State:', gameState);
  return (
    <View className="w-full h-full">
      <Modal isVisible={needsConfirmation}>
        <View className="w-[100%] h-fit p-5 rounded border border-1 border-stone-300 bg-white">
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
      {gameState?.guessingWords?.length ? (
        <CrosswordV2
          gameState={gameState}
          onGameStateUpdate={debounceSaveState}
        />
      ) : null}
    </View>
  );
}