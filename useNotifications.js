import { useEffect, useRef, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { navigate } from "@/navigation/navigationRef";
import { storage } from "@/storage";
import { STORAGE_KEYS } from "@/constants/enums";
import { NAVIGATION } from "@/constants";

// Silence migration warning (RNFirebase v22+)
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

export function useNotifications() {
  const [permissions, setPermissions] = useState(false);
  const processedMessageIds = useRef(new Set());

  /**
   * 1. Ask for (and request) notification permission.
   * 2. If granted, call getFcmToken() immediately.
   */
  async function requestUserPermissionAndToken() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Notification permission not granted.");
        alert("Please enable notifications in your device settings.");
        return false;
      }

      // Permission granted → fetch & store FCM token right away
      await getFcmToken();
      return true;
    } catch (error) {
      console.error("Error during permission request:", error);
      return false;
    }
  }

  /**
   * Fetch FCM token from Firebase and store it locally (AsyncStorage or whatever).
   */
  async function getFcmToken() {
    try {
      const fcmToken = await messaging().getToken();
      console.log("FCM Token:", fcmToken);
      if (fcmToken) {
        storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      }
    } catch (error) {
      console.log("Error fetching FCM token:", error);
    }
  }

  /**
   * Determine where to navigate when a notification click comes in.
   */
  function navigateToChat(notificationData) {
    if (notificationData?.type === "new_chat") {
      navigate(NAVIGATION.chatScreen, {
        rideId: notificationData.rideId,
        driverInfo: notificationData?.userId,
      });
    }
  }

  /**
   * Called whenever the user taps a delivered notification.
   */
  function handleNotificationClick(response) {
    console.log("Notification clicked:", JSON.stringify(response));
    const notificationData = response?.notification?.request?.content?.data ?? {};
    navigateToChat(notificationData);
  }

  /**
   * Schedule a local notification (Expo) for an incoming FCM message.
   * Use processedMessageIds to avoid duplicates.
   */
  async function scheduleNotification(remoteMessage) {
    const messageId = remoteMessage?.messageId || remoteMessage?.data?.id;
    if (!messageId || processedMessageIds.current.has(messageId)) {
      return;
    }

    // Mark as processed
    processedMessageIds.current.add(messageId);

    const notificationContent = {
      title: remoteMessage?.notification?.title || remoteMessage?.data?.title,
      body: remoteMessage?.notification?.body || remoteMessage?.data?.body,
      data:
        typeof remoteMessage?.data?.data === "string"
          ? JSON.parse(remoteMessage.data.data)
          : remoteMessage?.data?.data ?? {},
    };

    console.log("Scheduling notification:", notificationContent);

    try {
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // show immediately
      });
    } catch (err) {
      console.error("Error scheduling local notification:", err);
    }
  }

  /**
   * useEffect runs once (empty deps). Registers all listeners immediately and
   * returns a cleanup function so listeners are removed on unmount.
   */
  useEffect(() => {
    let onMessageUnsubscribe = null;
    let onOpenedAppUnsubscribe = null;
    let notificationClickSubscription = null;

    // 1) Immediately ask for permission and token:
    requestUserPermissionAndToken()
      .then((granted) => {
        setPermissions(granted);
      })
      .catch((err) => {
        console.error("Error in permission/token flow:", err);
      });

    // 2) Tell Expo how to display an incoming notification
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // 3) If the user taps a notification (foreground OR background), handle it here:
    notificationClickSubscription =
      Notifications.addNotificationResponseReceivedListener(handleNotificationClick);

    // 4) If a notification causes the app to open from background (but not killed):
    onOpenedAppUnsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("Opened from background by notification:", JSON.stringify(remoteMessage));
      const data =
        typeof remoteMessage?.data?.data === "string"
          ? JSON.parse(remoteMessage.data.data)
          : remoteMessage?.data?.data ?? {};
      navigateToChat(data);
    });

    // 5) If the app was killed and opened by a notification:
    messaging()
      .getInitialNotification()
      .then((initialNotification) => {
        if (initialNotification) {
          console.log("Opened from quit state by notification:", JSON.stringify(initialNotification));
          const data =
            typeof initialNotification?.data?.data === "string"
              ? JSON.parse(initialNotification.data.data)
              : initialNotification?.data?.data ?? {};
          navigateToChat(data);
        }
      })
      .catch(console.error);

    // 6) Background message handler (app in background or killed; receives FCM):
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Message handled in the background:", remoteMessage);
      await scheduleNotification(remoteMessage);
    });

    // 7) Foreground message handler (app is in foreground and receives FCM):
    onMessageUnsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("Message received in foreground:", remoteMessage);
      await scheduleNotification(remoteMessage);
    });

    // 8) Return cleanup so all subscriptions are removed on unmount:
    return () => {
      if (onMessageUnsubscribe) {
        onMessageUnsubscribe();
      }
      if (onOpenedAppUnsubscribe) {
        onOpenedAppUnsubscribe();
      }
      if (notificationClickSubscription) {
        notificationClickSubscription.remove();
      }
    };
  }, []); // ← run once on mount

  // Only export `permissions`—everything else is handled internally
  return { permissions };
}
