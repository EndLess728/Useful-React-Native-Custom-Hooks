import { useState, useCallback } from "react";
import {
  useMediaLibraryPermissions,
  useCameraPermissions,
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
} from "expo-image-picker";

const useMediaPicker = () => {
  const [mediaStatus, requestMediaPermission] = useMediaLibraryPermissions();
  const [cameraStatus, requestCameraPermission] = useCameraPermissions();
  const [media, setMedia] = useState(null);

  // Function to open the image library
  const pickImageWithLibrary = useCallback(async () => {
    if (!mediaStatus?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) return; // Exit if permission not granted
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  }, [mediaStatus, requestMediaPermission]);

  // Function to open the camera
  const pickImageWithCamera = useCallback(async () => {
    if (!cameraStatus?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return; // Exit if permission not granted
    }

    const result = await launchCameraAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia(result.assets[0]);
    }
  }, [cameraStatus, requestCameraPermission]);

  const resetMedia = () => setMedia(null);

  return { media, pickImageWithLibrary, pickImageWithCamera, resetMedia };
};

export default useMediaPicker;
