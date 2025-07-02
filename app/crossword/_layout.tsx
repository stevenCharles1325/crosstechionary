import { Stack } from 'expo-router';

export default function CrosswordLayout() {
  return (
    <Stack>
      {/* Dynamic product screen */}
      <Stack.Screen
        name="[action]" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}