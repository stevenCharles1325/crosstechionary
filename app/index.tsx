import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { CrosswordState } from '~/lib/utils';
import { GameState } from '~/types/crossword';

export default function Screen() {
  const router = useRouter();
  const [existingGameState, setExistingGameState] = React.useState<GameState | null>(null);

  React.useEffect(() => {
    (async () => {
      setExistingGameState(
        await CrosswordState.loadState()
      );
    })();
  }, []);

  return (
    <View className='flex-1 justify-center items-center gap-5 p-6 bg-secondary/30'>
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
      </View>
    </View>
  );
}
