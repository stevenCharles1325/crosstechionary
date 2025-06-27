import { Stack } from 'expo-router';

export default function DescriptionLayout() {
  return (
    <Stack>
      {/* Dynamic product screen */}
      <Stack.Screen 
        name="[word]" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}