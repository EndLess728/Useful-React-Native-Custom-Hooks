import { useState, useCallback, useEffect } from "react";
import {
  useMediaLibraryPermissions,
  useCameraPermissions,
  launchImageLibraryAsync,
  launchCameraAsync,
  ImagePickerResult,
  PermissionResponse,
  MediaType,
  ImagePickerOptions,
} from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { MEDIA_TYPES } from "@/constants/strings";
import { generateUID } from "@/utils/globalMethods";
import * as VideoThumbnails from "expo-video-thumbnails";

// For images/videos
export interface MediaAsset {
  uri: string;
  type?: string;
  id: string;
  name?: string | null;
  thumbnail?: string;
  mimeType?: string | null;
}

// For documents
export interface DocumentAsset {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
  id: string;
}

const useMediaPicker = (
  mediaType?: MediaType | MediaType[],
  options?: ImagePickerOptions
) => {
  const [mediaStatus, requestMediaPermission] = useMediaLibraryPermissions();
  const [cameraStatus, requestCameraPermission] = useCameraPermissions();

  const [media, setMedia] = useState<MediaAsset | DocumentAsset | null>(null);
  const [multipleMedia, setMultipleMedia] = useState<
    (MediaAsset | DocumentAsset)[] | null
  >(null);
  const [thumbnail, setThumbail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    generateThumbnail();
  }, [media?.uri, mediaType]);

  const generateThumbnail = async () => {
    if (!media?.uri || mediaType !== MEDIA_TYPES.VIDEOS) return;

    setLoading(true);
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(media?.uri, {
        time: 15000,
      });
      setThumbail(uri);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePermission = async (
    status: PermissionResponse | null,
    requestPermission: () => Promise<PermissionResponse>
  ): Promise<boolean> => {
    if (!status?.granted) {
      const permission = await requestPermission();
      return permission.granted;
    }
    return true;
  };

  const chooseImageFromLibrary = useCallback(async () => {
    const hasPermission = await handlePermission(
      mediaStatus,
      requestMediaPermission
    );
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result: ImagePickerResult = await launchImageLibraryAsync({
        mediaTypes: mediaType || (MEDIA_TYPES.IMAGES as MediaType),
        quality: 1,
        ...(mediaType === MEDIA_TYPES.IMAGES && { allowsEditing: true }),
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (options?.allowsMultipleSelection && !options?.allowsEditing) {
          const mappedResults = result.assets.map((asset) => {
            return {
              uri: asset.uri,
              type: asset.type,
              id: generateUID(),
              name: asset.fileName,
              mimeType: asset.mimeType,
            };
          });
          setMultipleMedia(mappedResults);
        } else {
          const asset = result.assets[0];
          setMedia({
            uri: asset.uri,
            type: asset.type,
            id: generateUID(),
            name: asset.fileName,
            mimeType: asset.mimeType,
          });
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [mediaStatus, requestMediaPermission, mediaType]);

  const pickImageWithCamera = useCallback(async () => {
    const hasPermission = await handlePermission(
      cameraStatus,
      requestCameraPermission
    );
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result: ImagePickerResult = await launchCameraAsync({
        mediaTypes: mediaType || (MEDIA_TYPES.IMAGES as MediaType),
        quality: 1,
        ...(mediaType === MEDIA_TYPES.IMAGES && { allowsEditing: true }),
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (options?.allowsMultipleSelection && !options?.allowsEditing) {
          const mappedResults = result.assets.map((asset) => {
            return {
              uri: asset.uri,
              type: asset.type,
              id: generateUID(),
              name: asset.fileName,
              mimeType: asset.mimeType,
            };
          });
          setMultipleMedia(mappedResults);
        } else {
          const asset = result.assets[0];
          setMedia({
            uri: asset.uri,
            type: asset.type,
            id: generateUID(),
            name: asset.fileName,
            mimeType: asset.mimeType,
          });
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [cameraStatus, requestCameraPermission, mediaType]);

  const pickDocument = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ["image/*", "application/pdf"],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (options?.allowsMultipleSelection && !options?.allowsEditing) {
          const mappedResults = result.assets.map((doc) => {
            return {
              uri: doc.uri,
              name: doc.name,
              size: doc.size,
              mimeType: doc.mimeType,
              id: generateUID(),
            };
          });
          setMultipleMedia(mappedResults);
        } else {
          const doc = result.assets[0];
          setMedia({
            uri: doc.uri,
            name: doc.name,
            size: doc.size,
            mimeType: doc.mimeType,
            id: generateUID(),
          });
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetMedia = () => {
    setMedia(null);
    setMultipleMedia(null);
    setThumbail("");
  };

  return {
    media,
    thumbnail,
    loading,
    multipleMedia,
    chooseImageFromLibrary,
    pickImageWithCamera,
    pickDocument,
    resetMedia,
  };
};

export default useMediaPicker;
