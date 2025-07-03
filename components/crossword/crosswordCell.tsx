import React, { memo, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { NativeSyntheticEvent, TextInputChangeEventData, TextInputKeyPressEventData, StyleSheet, Animated, Easing, View, Text } from "react-native";
import { ExclusiveGesture, TextInput, Gesture, GestureDetector } from "react-native-gesture-handler";
import { appColor } from "~/lib/constants";

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CrossWordCellProps {
  value: string;
  cell: string;
  positionKey: string,
  rowIndex: number,
  cellIndex: number,
  isEditable: boolean;
  shouldShake: boolean;
  shouldHighlight: boolean;
  hasBeenGuessed: boolean;
  wordPositions: number[] | null;
  cellsRef: RefObject<Record<string, TextInput>>;
  gesture: (positionKey: string) => ExclusiveGesture;
  onChange: (positionKey: string) => (e: NativeSyntheticEvent<TextInputChangeEventData>) => void;
  onKeyPress: (positionKey: string) => (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
}

export const CrossWordCell = memo((props: CrossWordCellProps) => {
  const {
    cell,
    value,
    cellsRef,
    isEditable,
    positionKey,
    shouldShake,
    wordPositions,
    hasBeenGuessed,
    shouldHighlight,
    gesture,
    onChange,
    onKeyPress,
  } = props;
  
  const [isFocused, setIsFocused] = useState(false);
  const isBlankCell = cell === '-';
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeInterpolation = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10]
  });

  const incorrectAnswerStyle = useMemo(() => ({
    transform: [{ translateX: shakeInterpolation }]
  }), [shakeInterpolation]);

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (shouldShake) runShake();
  }, [shouldShake]);

  return (
    <View
      style={styles.cellContainer}
    >
      {/* Word Position */}
      {!isBlankCell && wordPositions ?
      <View style={[
        styles.smallDigitContainer,
        
      ]}>
        <View className="flex flex-row gap-1">
          {wordPositions.map((position, index) => (
            <Text
              key={`word-position-${position}-${cell}-${index}`}
              style={[
                styles.smallDigit,
                hasBeenGuessed && styles.smallDigitOnGuessedCell
              ]}
            >
              {position}
            </Text>
          ))}
        </View>
      </View>
      : null}

      {isBlankCell
      ? <View
          style={[
            styles.cell,
            styles.staticCell
          ]}
        />
      : (
        <AnimatedView
          style={[
            shouldShake && incorrectAnswerStyle,
          ]}
        >
          <GestureDetector gesture={gesture(positionKey)}>
            <AnimatedTextInput
              autoCapitalize="characters"
              maxLength={1}
              ref={(ref: any) => {
                if (ref) cellsRef.current[positionKey] = ref;
              }}
              caretHidden
              style={[
                styles.cell,
                shouldHighlight && styles.highlightedCell,
                hasBeenGuessed && styles.correctCell,
                isFocused && styles.focusedField,
              ]}
              editable={isEditable}
              value={value}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selection={{ start: value?.length || 0, end: value?.length || 0 }}
              onChange={onChange(positionKey)}
              onKeyPress={onKeyPress(positionKey)}
            />
          </GestureDetector>
        </AnimatedView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cellContainer: {
		position: 'relative',
    flexShrink: 0,
	},
	cell: {
		borderWidth: 1,
		margin: 1,
		borderColor: appColor.neonCyanBlue,
    borderRadius: 5,
		width: 30,
		height: 33,
    lineHeight: 1,
    padding: 0,
		textAlign: 'center',
    color: 'white'
	},
	staticCell: {
		borderColor: 'transparent',
    borderWidth: 0,
		color: 'white',
	},
  correctCell: {
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: appColor.neonCyanBlue,
  },
  highlightedCell: {
    backgroundColor: '#003858',
  },
  focusedField: {
    borderWidth: 2.5,
  },
	smallDigitContainer: {
		position: 'absolute',
		top: 3,
		left: 3,
    display: 'flex',
    flexDirection: 'row',
    gap: 2,
    zIndex: 2,
	},
  smallDigit: {
		fontSize: 10,
		fontWeight: 'bold',
    color: '#fff',
	},
  smallDigitOnGuessedCell: {
    color: '#fff',
  },
	button: {
		flex: 1, // Ensure equal width for both buttons
	},
	gap: {
		width: 10, // Adjust the width as needed for the desired gap
	},
});