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

## Contributing
Feel free to contribute by adding more useful hooks or improving existing ones. Simply fork the repository, make your changes, and submit a pull request.

## License
This project is open-source and available under the MIT License.

