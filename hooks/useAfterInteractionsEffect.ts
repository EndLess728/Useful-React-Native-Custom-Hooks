import { useEffect } from "react";
import { InteractionManager } from "react-native";

export const useAfterInteractionsEffect = (
  effect: () => void | (() => void),
  deps: React.DependencyList = []
): void => {
  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      effect();
    });

    return () => {
      interaction.cancel();
    };
  }, deps);
};
