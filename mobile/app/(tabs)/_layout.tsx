import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen name="Attendee" options={{
          headerShown: false
        }} />
        <Stack.Screen name="Organiser" options={{
          headerShown: false
        }} />

        <Stack.Screen name="Admin" options={{
          headerShown: false
        }} />


      </Stack>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 }
});
