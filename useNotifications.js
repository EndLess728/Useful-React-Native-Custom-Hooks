import { useEffect, useRef, useState } from "react";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { navigate } from "@/navigation/navigationRef";
import { storage } from "@/storage";
import { STORAGE_KEYS } from "@/constants/enums";
import { NAVIGATION } from "@/constants";

// Silence Firebase modular deprecation warnings globally
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

export function useNotifications() {
  const [permissions, setPermissions] = useState(false); // Track notification permission status
  const processedMessageIds = useRef(new Set()); // Store processed message IDs to prevent duplicates

  /**
   * Request user notification permissions
   * and fetch FCM token if permission is granted.
   */
  async function requestUserPermissionAndToken() {
    try {
      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // If not granted, request permissions
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If still not granted, show warning and exit
      if (finalStatus !== "granted") {
        console.warn("Notification permission not granted.");
        alert("Please enable notifications in your device settings.");
        return false;
      }

      // Fetch FCM token after permission granted
      await getFcmToken();
      return true;
    } catch (error) {
      console.error("Error during permission request:", error);
      return false;
    }
  }

  /**
   * Fetch Firebase Cloud Messaging (FCM) token
   * and save it in secure storage.
   */
  async function getFcmToken() {
    try {
      const fcmToken = await messaging().getToken();
      console.log("FCM Token:", fcmToken);
      if (fcmToken) {
        storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      }
    } catch (error) {
      console.error("Error fetching FCM token:", error);
    }
  }

  /**
   * Navigate to chat screen based on notification data.
   */
  function navigateToChat(notificationData) {
    console.log(
      "Navigating with data:",
      JSON.stringify(notificationData, null, 2)
    );

    if (notificationData?.notification_type === "RIDE_REQUESTED") {
      navigate(NAVIGATION.chatScreen, {
        rideId: notificationData.rideId,
        driverInfo: notificationData.sender || notificationData.customer,
      });
    } else if (notificationData?.type === "new_chat") {
      navigate(NAVIGATION.chatScreen, {
        rideId: notificationData.rideId,
        driverInfo: notificationData.userId,
      });
    } else {
      console.warn(
        "Unknown notification type:",
        notificationData?.notification_type || notificationData?.type
      );
    }
  }

  /**
   * Handle user clicking a local notification.
   */
  function handleNotificationClick(response) {
    console.log("Notification clicked:", JSON.stringify(response, null, 2));
    const notificationData =
      response?.notification?.request?.content?.data ?? {};
    // Navigate to chat if needed
    // navigateToChat(notificationData);
  }

  /**
   * Schedule a local notification for foreground messages
   * or background data-only messages.
   */
  async function scheduleNotification(remoteMessage) {
    // Deduplicate using messageId or fallback keys
    const messageId =
      remoteMessage?.messageId ||
      remoteMessage?.data?.id ||
      JSON.stringify(remoteMessage?.data);

    console.log(
      "Checking messageId:",
      messageId,
      "Processed IDs:",
      Array.from(processedMessageIds.current)
    );

    // Skip if already processed or invalid
    if (!messageId || processedMessageIds.current.has(messageId)) {
      console.log("Skipping duplicate or invalid message:", messageId);
      return;
    }

    processedMessageIds.current.add(messageId);

    // Prevent unbounded memory growth
    if (processedMessageIds.current.size > 1000) {
      processedMessageIds.current.clear();
      console.log("Cleared processedMessageIds to prevent memory issues");
    }

    // Prepare notification content
    const notificationContent = {
      title: remoteMessage?.data?.title || remoteMessage?.notification?.title,
      body: remoteMessage?.data?.body || remoteMessage?.notification?.body,
      data: remoteMessage?.data ?? {},
    };

    console.log(
      "Scheduling notification:",
      JSON.stringify(notificationContent, null, 2)
    );

    try {
      // Show as local notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Trigger immediately
      });
    } catch (err) {
      console.error("Error scheduling local notification:", err);
    }
  }

  /**
   * Lifecycle hook to initialize notification handling.
   */
  useEffect(() => {
    let onMessageUnsubscribe = null;
    let onOpenedAppUnsubscribe = null;
    let notificationClickSubscription = null;

    // Request notification permissions + token on mount
    requestUserPermissionAndToken()
      .then((granted) => setPermissions(granted))
      .catch((err) => {
        console.error("Error in permission/token flow:", err);
      });

    // Configure notification handler (foreground behavior)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Listen for when a user taps a local notification
    notificationClickSubscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationClick
      );

    // When app is in background and opened by tapping notification
    onOpenedAppUnsubscribe = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.log(
          "Opened from background by notification:",
          JSON.stringify(remoteMessage, null, 2)
        );
        // navigateToChat(remoteMessage?.data ?? {});
      }
    );

    // When app is opened from quit state by tapping notification
    messaging()
      .getInitialNotification()
      .then((initialNotification) => {
        if (initialNotification) {
          console.log(
            "Opened from quit state by notification:",
            JSON.stringify(initialNotification, null, 2)
          );
          // navigateToChat(initialNotification?.data ?? {});
        }
      })
      .catch((err) =>
        console.error("Error checking initial notification:", err)
      );

    // Handle background messages (data-only, no FCM UI)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log(
        "Message handled in background:",
        JSON.stringify(remoteMessage, null, 2)
      );

      // Skip scheduling if FCM already displays a system notification
      if (remoteMessage?.notification) {
        console.log(
          "Skipping local notification in background; using FCM system notification"
        );
        return;
      }

      await scheduleNotification(remoteMessage);
    });

    // Handle foreground messages (always schedule local notification)
    onMessageUnsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log(
        "Message received in foreground:",
        JSON.stringify(remoteMessage, null, 2)
      );
      await scheduleNotification(remoteMessage);
    });

    // Cleanup subscriptions on unmount
    return () => {
      if (onMessageUnsubscribe) onMessageUnsubscribe();
      if (onOpenedAppUnsubscribe) onOpenedAppUnsubscribe();
      if (notificationClickSubscription) notificationClickSubscription.remove();
    };
  }, []);

  return { permissions };
}
