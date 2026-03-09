import { Stack ,useRouter } from "expo-router";
import {  GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { useEffect } from "react";

export default function RootLayout() {

    const router = useRouter();
    

   
  return (
     <GestureHandlerRootView style={styles.container}>
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
