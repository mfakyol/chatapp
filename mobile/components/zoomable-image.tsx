import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

export function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const reset = (animated: boolean) => {
    'worklet';
    scale.value = animated ? withTiming(1) : 1;
    translateX.value = animated ? withTiming(0) : 0;
    translateY.value = animated ? withTiming(0) : 0;
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
  };

  const clampTranslate = (value: number, size: number) => {
    'worklet';
    const max = (size * (scale.value - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        reset(true);
      } else {
        savedScale.value = scale.value;
        translateX.value = clampTranslate(translateX.value, width.value);
        translateY.value = clampTranslate(translateY.value, height.value);
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      translateX.value = clampTranslate(savedX.value + e.translationX, width.value);
      translateY.value = clampTranslate(savedY.value + e.translationY, height.value);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset(true);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={styles.container}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
          height.value = e.nativeEvent.layout.height;
        }}
      >
        <Animated.View style={[styles.flex, animatedStyle]}>
          <Image source={{ uri }} style={styles.flex} contentFit="contain" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
});
