import { useEffect } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const useShakeAnimation = (error: string) => {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-5, { duration: 90 }),
        withTiming(5, { duration: 90 }),
        withTiming(-5, { duration: 90 }),
        withTiming(5, { duration: 90 }),
        withTiming(0, { duration: 90 })
      );
    }
  }, [error]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return { animatedStyle };
};

export default useShakeAnimation;
