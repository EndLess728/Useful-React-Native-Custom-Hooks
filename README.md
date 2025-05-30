# Useful React Native Custom Hooks

This repository contains a collection of useful custom hooks for React Native development. These hooks simplify common functionalities and improve code reusability in React Native applications.

## Installation

You can copy and use these hooks directly in your React Native project. Simply place the desired hook in your `hooks/` directory and import it into your components.

---

## Available Hooks

### 1. `useAppActiveState.js`

#### Description:
This hook listens for changes in the app's active state (foreground/background) and returns whether the app is currently active.

#### Usage:
```javascript
import useAppActiveState from './useAppActiveState';

useAppActiveState(() => {
    fetchActiveRide();
}); // Call any method when app comes to foreground
```

---

### 2. `useBackHandler.js`

#### Description:
This hook provides a way to handle the hardware back button press on Android devices.

#### Usage:
```javascript
import useBackHandler from './useBackHandler';

useBackHandler(() => {
  console.log('Back button pressed');
  return true; // Prevent default back action
});
```

---

### 3. `useMediaPicker.js`

#### Description:
This hook helps in selecting media (images/videos) from the device gallery or camera using the appropriate permissions.

#### Usage:
```javascript
import useMediaPicker from './useMediaPicker';

const { media, resetMedia, pickImageWithCamera, pickImageWithLibrary } =
    useMediaPicker();
```

---

### 4. `useNetworkStatus.js`

#### Description:
This hook monitors the network connection status and returns whether the device is online or offline.

#### Usage:
```javascript
import useNetworkStatus from './useNetworkStatus';

const isOnline = useNetworkStatus();

console.log(isOnline ? 'Online' : 'Offline');
```

---

### 5. `useNotifications.js`

#### Description:
This hook manages push notifications using Firebase Cloud Messaging (`@react-native-firebase/messaging`) and Expo Notifications (`expo-notifications`). It handles notification permissions, retrieves the FCM token, and navigates users based on notification clicks.

#### Usage:
```javascript
import React, { useEffect } from "react";
import { View, Text, Button, Alert } from "react-native";
import { useNotifications } from "./useNotifications"; // Adjust the path as needed

const App = () => {
  const { permissions } = useNotifications(); // Use this in App.js or RootNavigator.js,

  useEffect(() => {
    if (permissions) {
      Alert.alert("Notifications Enabled", "You will receive push notifications.");
    } else {
      Alert.alert("Notifications Disabled", "Enable them in settings.");
    }
  }, [permissions]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Push Notification Example</Text>
    </View>
  );
};

export default NotificationScreen;
```

---

### 6. `useKeyboard.js`

#### Description:
This hook listens for keyboard visibility changes and provides the keyboard height.

#### Usage:
```javascript
import useKeyboard from './useKeyboard';
import { View, TextInput, Text, Button } from 'react-native';

const ExampleScreen = () => {
  const { isKeyboardVisible, keyboardHeight, closeKeyboard } = useKeyboard();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TextInput placeholder="Type something" style={{ height: 40, borderBottomWidth: 1, width: '80%' }} />
      {isKeyboardVisible && <Text>Keyboard is visible</Text>}
      <Text>Keyboard Height: {keyboardHeight}px</Text>
      <Button title="Dismiss Keyboard" onPress={closeKeyboard} />
    </View>
  );
};

export default ExampleScreen;
```

---

## Contributing
Feel free to contribute by adding more useful hooks or improving existing ones. Simply fork the repository, make your changes, and submit a pull request.

## License
This project is open-source and available under the MIT License.

