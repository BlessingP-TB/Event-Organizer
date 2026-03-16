import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import {  GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { useEffect } from "react";
import { registerForPushNotificationsAndSync } from "@/hooks/pushNotifications";
import { PushStatusBanner } from "@/components/PushStatusBanner";

export default function RootLayout() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    registerForPushNotificationsAndSync().catch((error) => {
      console.warn("Initial push token sync failed:", error?.message || error);
    });
  }, []);

   
  return (
     <GestureHandlerRootView style={styles.container}>
      <PushStatusBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false
         }} />
         
      </Stack>
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
