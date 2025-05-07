import { useEffect, useState } from "react";
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
  // Store processed message IDs to prevent duplicate notifications
  const [processedMessageIds, setProcessedMessageIds] = useState(new Set());

  const requestUserPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Notification permission not granted.");
        alert("Please enable notifications in your settings.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  };

  const handleNotificationClick = async (response) => {
    console.log("Response on notification click:", JSON.stringify(response));
    const notificationData = response?.notification?.request?.content?.data;
    navigateToChat(notificationData);
  };

  const getFcmToken = async () => {
    try {
      const fcmToken = await messaging().getToken();
      console.log("fcmToken:", fcmToken);
      if (fcmToken) {
        storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      }
    } catch (error) {
      console.log("error fetching fcm token:", error);
    }
  };

  const navigateToChat = (notificationData) => {
    if (notificationData?.type === "new_chat") {
      navigate(NAVIGATION.chatScreen, {
        rideId: notificationData?.rideId,
        driverInfo: notificationData?.userId,
      });
    }
  };

  const scheduleNotification = async (remoteMessage) => {
    const messageId = remoteMessage?.messageId || remoteMessage?.data?.id;
    if (!messageId) {
      console.warn("No messageId found in remoteMessage, skipping notification");
      return;
    }

    // Check if message has already been processed
    if (processedMessageIds.has(messageId)) {
      console.log(`Message ${messageId} already processed, skipping notification`);
      return;
    }

    // Add messageId to processed set
    setProcessedMessageIds((prev) => new Set(prev).add(messageId));

    const notification = {
      title: remoteMessage?.notification?.title || remoteMessage?.data?.title,
      body: remoteMessage?.notification?.body || remoteMessage?.data?.body,
      data: remoteMessage?.data?.data ? JSON.parse(remoteMessage?.data?.data) : {},
    };

    console.log("Scheduling notification:", notification);

    await Notifications.scheduleNotificationAsync({
      content: notification,
      trigger: null,
    });
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      const permissionAllowed = await requestUserPermission();
      setPermissions(permissionAllowed);

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Listener for notification clicks
      const notificationClickSubscription =
        Notifications.addNotificationResponseReceivedListener(handleNotificationClick);

      // Handle notification opened while app is in background
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log("Notification caused app to open from background state:", JSON.stringify(remoteMessage));
        const notificationData = remoteMessage?.data?.data ? JSON.parse(remoteMessage?.data?.data) : {};
        navigateToChat(notificationData);
      });

      // Handle notification when app was quit
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        const notificationData = initialNotification?.data?.data
          ? JSON.parse(initialNotification?.data?.data)
          : {};
        navigateToChat(notificationData);
      }

      // Handle push notifications in the background
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log("Message handled in the background!", remoteMessage);
        await scheduleNotification(remoteMessage);
      });

      // Handle push notifications in the foreground
      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log("Message received in foreground:", remoteMessage);
        await scheduleNotification(remoteMessage);
      });

      return () => {
        unsubscribe();
        notificationClickSubscription.remove();
      };
    };

    initializeNotifications();
  }, []);

  return { getFcmToken, permissions };
};
