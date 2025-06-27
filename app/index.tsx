import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { CrosswordState } from '~/lib/utils';
import { useMemo } from 'react';

export default function Screen() {
  const router = useRouter();
  const existingGameState = useMemo(() => CrosswordState.loadState(), []);

  return (
    <View className='flex-1 justify-center items-center gap-5 p-6 bg-secondary/30'>
      <View className='flex flex-col gap-5 bg-slate-40 w-[250px]'>
        <Button onPress={() => router.push('/dictionary')}>
          <Text>Dictionary</Text>
        </Button>
        <Button>
          <Text>New Game</Text>
        </Button>
        {existingGameState && (
          <Button>
            <Text>Continue Game</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
