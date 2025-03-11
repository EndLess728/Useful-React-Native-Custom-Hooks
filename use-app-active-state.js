import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const useAppActiveState = (callback) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && appState.current === "background") {
        callback();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
};

export { useAppActiveState };
