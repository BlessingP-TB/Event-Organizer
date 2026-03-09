import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      {/* orgaDash tab first, with title "Home" */}
      <Tabs.Screen
        name="adminDash"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          title: "Home",
        }}
      />

      {/* app tab in the middle */}
      <Tabs.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          title: "Profile",
        }}
      />



      <Tabs.Screen
        name="Calender"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-month" size={size} color={color} />
          ),
          title: "Calender",
        }}
      />
      <Tabs.Screen
        name="userManagement" // This MUST match the folder name
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
          title: "Users",
          headerShown: false, // The stack has its own header
        }}
      />
      {/* ✅✅✅ END OF NEW BLOCK ✅✅✅
      */}
      <Tabs.Screen
        name="approved"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} />,
          title: "Approved",
          headerTitleAlign: 'center',
          href: null,
        }}
      />

      <Tabs.Screen name="eventDetails" options={{ href: null }} />

      <Tabs.Screen name="report" options={{
        title: "report",
        headerTitleAlign: 'center', href: null
      }} />

      <Tabs.Screen name="AvailableVenue" options={{ href: null }} />
      <Tabs.Screen name="EventAIReport" options={{ href: null }} />
      {/* Tools / Settings tab */}
      <Tabs.Screen
        name="Tools"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
          title: "Resources",
        }}
      />



    </Tabs>
  );
}
