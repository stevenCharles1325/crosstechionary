import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import dictionary from "~/data/dictionary.json";
import { useMemo, useState } from "react";
import { Text } from '~/components/ui/text';
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useRouter } from "expo-router";

const typedDict = dictionary as Record<string, { clue: string, answer: string }[]>;

export default function Dictionary() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');

  // Compute filtered+grouped data
  const groupedFiltered = useMemo(() => {
    const letters = Object.keys(typedDict).sort();

    return letters.flatMap(letter => {
      // Filter items by answer including searchText (case-insensitive)
      const filteredItems = typedDict[letter].filter(item =>
        item.answer.toLowerCase().includes(searchText.toLowerCase())
      );

      if (filteredItems.length === 0) {
        return []; // Skip this section entirely
      }

      return [
        { type: 'header', title: letter },
        ...filteredItems.map(item => ({ type: 'item', ...item }))
      ];
    });
  }, [searchText]);

  return (
    <View className="w-full h-full">
      <View className="flex flex-row justify-start items-center w-full">
        <Input
          className="grow"
          value={searchText}
          placeholder="Search..."
          onChangeText={(text) => setSearchText(text)}
        />
      </View>
      <FlashList
        data={groupedFiltered}
        estimatedItemSize={40}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View className="bg-[#f0f0f0] px-2">
                {/* @ts-ignore */}
                <Text className="text-[#000] font-bold">{item.title}</Text>
              </View>
            );
          }

          return (
            <View className="p-[8px] w-full">
              <Button
                variant="ghost"
                className="w-full"
                onPress={() => router.push({
                  pathname: '/description/[word]',
                  /* @ts-ignore */
                  params: { word: item.answer }
                })}
              >
                {/* @ts-ignore */}
                <Text className="w-full text-start">{item.answer}</Text>
              </Button>
            </View>
          );
        }}
      />
    </View>
  );
}