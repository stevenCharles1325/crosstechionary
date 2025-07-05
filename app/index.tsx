import * as React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { CrosswordState } from '~/lib/utils';
import { GameState } from '~/types/crossword';
import Modal from 'react-native-modal';
import { appColor } from '~/lib/constants';
import { useFocusEffect } from '@react-navigation/native';

export default function Screen() {
  const router = useRouter();
  const [existingGameState, setExistingGameState] = React.useState<GameState | null>(null);
  const [isResettingGame, setIsResettingGameState] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        setExistingGameState(
          await CrosswordState.loadState()
        );
      })();
    }, [])
  );

  return (
      <ImageBackground
        source={require('../assets/appImages/background-image.png')}
        className='flex-1 justify-center items-center gap-5 p-6 bg-secondary/30'
      >
        <Modal isVisible={isResettingGame}>
          <View className="w-[100%] h-fit p-5 rounded-xl border border-1" style={{ borderColor: appColor.neonCyanBlue, backgroundColor: appColor.jetBlack }}>
            <Text>Proceeding will clear previous progress, are you sure?</Text>
            <View className="w-full h-fit flex flex-row justify-end">
              <Button
                variant="ghost"
                onPress={() => {
                  setIsResettingGameState(false);
                  CrosswordState.clearState();
                  setExistingGameState(null);

                  router.push({
                    pathname: '/crossword/[action]',
                    params: { action: 'new_game' }
                  });
                }}
              >
                <Text>Yes</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => setIsResettingGameState(false)}
              >
                <Text style={{ color: appColor.neonCyanBlue }}>No</Text>
              </Button>
            </View>
          </View>
        </Modal>

        <View className='flex flex-col gap-5 bg-slate-40 w-[250px]'>
          <Button style={[styles.buttonStyle]} onPress={() => router.push('/dictionary')}>
            <Text className='text-white'>Dictionary</Text>
          </Button>
          <Button
            style={[styles.buttonStyle]}
            onPress={() => 
              router.push({
                pathname: '/crossword/[action]',
                params: { action: 'new_game' }
              })
            }
          >
            <Text className='text-white'>New Game</Text>
          </Button>

          {existingGameState && (
            <Button
              style={[styles.buttonStyle]}
              onPress={() => 
                router.push({
                  pathname: '/crossword/[action]',
                  params: { action: 'continue' }
                })
              }
            >
              <Text className='text-white'>Continue Game</Text>
            </Button>
          )}

          {existingGameState && existingGameState.level > 1 && (
            <Button style={[styles.buttonStyle]} onPress={() => setIsResettingGameState(true)}>
              <Text className='text-white'>Reset Game</Text>
            </Button>
          )}
        </View>
      </ImageBackground>
  );
}

const styles = StyleSheet.create({
  buttonStyle: {
    backgroundColor: appColor.skyBlue,
    borderRadius: 20,
  }
})
