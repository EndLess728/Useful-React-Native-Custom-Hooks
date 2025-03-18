import {useState, useEffect} from 'react';
import {Keyboard, Platform} from 'react-native';

const useKeyboard = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEventName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEventName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      showEventName,
      event => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(hideEventName, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    // Cleanup function
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Method to close the keyboard
  const closeKeyboard = () => {
    Keyboard.dismiss();
  };

  return {isKeyboardVisible, keyboardHeight, closeKeyboard};
};

export default useKeyboard;
