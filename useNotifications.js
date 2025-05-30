import { useEffect, useState, useRef, useCallback } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { navigate } from "@/navigation/navigationRef";
import { storage } from "@/storage";
import { STORAGE_KEYS } from "@/constants/enums";
import { NAVIGATION } from "@/constants";

// Silence migration warning - https://rnfirebase.io/migrating-to-v22
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

export const useNotifications = () => {
  const [permissions, setPermissions] = useState(false);
  const processedIdsRef = useRef(new Set());

  const requestPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Notification permission not granted.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error requesting notification permissions:", err);
      return false;
    }
  };

  const getAndStoreFcmToken = async () => {
    try {
      const token = await messaging().getToken();
      if (token) {
        storage.set(STORAGE_KEYS.FCM_TOKEN, token);
        console.log("Stored FCM token:", token);
      }
    } catch (err) {
      console.error("Failed to get/store FCM token:", err);
    }
  };

  const navigateToChat = useCallback((data) => {
    if (data?.type === "new_chat") {
      navigate(NAVIGATION.chatScreen, {
        rideId: data.rideId,
        driverInfo: data.userId,
      });
    }
  }, []);

  const scheduleNotification = useCallback(async (remoteMessage) => {
    const messageId = remoteMessage.messageId ?? remoteMessage.data?.id;
    if (!messageId) {
      console.warn("No messageId in remoteMessage, skipping");
      return;
    }
    if (processedIdsRef.current.has(messageId)) {
      console.log(`Already processed ${messageId}, skipping`);
      return;
    }
    processedIdsRef.current.add(messageId);

    const payload = {
      title: remoteMessage.notification?.title ?? remoteMessage.data?.title,
      body: remoteMessage.notification?.body ?? remoteMessage.data?.body,
      data: remoteMessage.data?.data ? JSON.parse(remoteMessage.data.data) : {},
    };
    console.log("Scheduling local notification:", payload);
    await Notifications.scheduleNotificationAsync({
      content: payload,
      trigger: null,
    });
  }, []);

  const handleNotificationClick = useCallback(
    (response) => {
      console.log("Notification clicked:", response);
      navigateToChat(response.notification.request.content.data);
    },
    [navigateToChat]
  );

  useEffect(() => {
    let unsubscribeMessage;
    let unsubscribeClick;
    let unsubscribeTokenRefresh;

    (async () => {
      const isGranted = await requestPermissions();
      setPermissions(isGranted);
      if (!isGranted) {
        alert("Please enable notifications in your settings.");
        return;
      }

      // FCM token management
      await getAndStoreFcmToken();
      unsubscribeTokenRefresh = messaging().onTokenRefresh((newToken) => {
        storage.set(STORAGE_KEYS.FCM_TOKEN, newToken);
        console.log("FCM token refreshed:", newToken);
      });

      // Show notifications when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // User taps on notification
      unsubscribeClick = Notifications.addNotificationResponseReceivedListener(handleNotificationClick);

      // App opened from quit state via notification
      const initial = await messaging().getInitialNotification();
      if (initial) {
        const data = initial?.data?.data ? JSON.parse(initial?.data?.data) : {};
        navigateToChat(data);
      }

      // App opened from background
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log("Opened from background:", remoteMessage);
        const data = remoteMessage.data.data ? JSON.parse(remoteMessage.data.data) : {};
        navigateToChat(data);
      });

      // Background push handler
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log("Background FCM:", remoteMessage);
        await scheduleNotification(remoteMessage);
      });

      // Foreground push handler
      unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
        console.log("Foreground FCM:", remoteMessage);
        await scheduleNotification(remoteMessage);
      });
    })();

    return () => {
      unsubscribeMessage && unsubscribeMessage();
      unsubscribeClick && unsubscribeClick.remove();
      unsubscribeTokenRefresh && unsubscribeTokenRefresh();
    };
  }, [handleNotificationClick, scheduleNotification]);

  return { permissions };
};
