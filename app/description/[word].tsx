import { useLocalSearchParams } from "expo-router";
import { useRouter } from 'expo-router';
import { useMemo } from "react";
import { View } from "react-native";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import words from "~/data/crossword-words.json"

export default function Description () {
  const router = useRouter();
  const { word } = useLocalSearchParams<{ word: string }>();

  if (!word) return router.back();
  
  const searchText = word.toLowerCase();

  const wordData = useMemo(() => 
    words.find(({ answer }) => 
      answer.toLowerCase().replaceAll('_', '-') === searchText)
  ,[searchText]);

  return (
    <View className="w-full h-full p-3">
      <Card>
        <CardHeader>
          <CardTitle className="capitalize mb-3">{wordData?.answer.replaceAll('_', '-')}</CardTitle>
          <CardDescription className="text-justify">{wordData?.clue}</CardDescription>
        </CardHeader>
      </Card>
      <Text></Text>
    </View>
  );
}