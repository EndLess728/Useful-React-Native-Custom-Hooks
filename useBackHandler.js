import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function useBackHandler(handler) {
  const navigation = useNavigation();

  useEffect(() => {
    BackHandler.addEventListener("hardwareBackPress", handler);
    navigation.addListener("gestureStart", handler);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handler);
      navigation.removeListener("gestureStart", handler);
    };
  }, [handler]);
}
