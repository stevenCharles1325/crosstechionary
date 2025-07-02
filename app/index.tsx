import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { CrosswordState } from '~/lib/utils';
import { GameState } from '~/types/crossword';
import Modal from 'react-native-modal';

export default function Screen() {
  const router = useRouter();
  const [existingGameState, setExistingGameState] = React.useState<GameState | null>(null);
  const [isResettingGame, setIsResettingGameState] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setExistingGameState(
        await CrosswordState.loadState()
      );
    })();
  }, []);

  return (
    <View className='flex-1 justify-center items-center gap-5 p-6 bg-secondary/30'>
      <Modal isVisible={isResettingGame}>
        <View className="w-[100%] h-fit p-5 rounded-xl border border-1 border-stone-300 bg-white">
          <Text>Proceeding will clear previous progress, are you sure?</Text>
          <View className="w-full h-fit flex flex-row justify-end">
            <Button
              variant="ghost"
              onPress={() => {
                CrosswordState.clearState();

                router.push({
                  pathname: '/crossword/[action]',
                  params: { action: 'new_game' }
                });
              }}
            >
              <Text className="text-red">Yes</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => setIsResettingGameState(false)}
            >
              <Text>No</Text>
            </Button>
          </View>
        </View>
      </Modal>

      <View className='flex flex-col gap-5 bg-slate-40 w-[250px]'>
        <Button onPress={() => router.push('/dictionary')}>
          <Text>Dictionary</Text>
        </Button>
        <Button 
          onPress={() => 
            router.push({
              pathname: '/crossword/[action]',
              params: { action: 'new_game' }
            })
          }
        >
          <Text>New Game</Text>
        </Button>

        {existingGameState && (
          <Button 
            onPress={() => 
              router.push({
                pathname: '/crossword/[action]',
                params: { action: 'continue' }
              })
            }
          >
            <Text>Continue Game</Text>
          </Button>
        )}

        {existingGameState && existingGameState.level > 1 && (
          <Button onPress={() => setIsResettingGameState(true)}>
            <Text>Reset Game</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
