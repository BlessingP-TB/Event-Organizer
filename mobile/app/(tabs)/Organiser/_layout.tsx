import { Tabs } from "expo-router";

import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs>
      {/* Home tab */}
      <Tabs.Screen
        name="orgaDash"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          title: "Home",
        }}
      />

      {/* Create tab inserted second */}
      <Tabs.Screen
        name="Create"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="add" size={size} color={color} />,
          title: "Create",
        }}
      />

      {/* Events tab  */}
      <Tabs.Screen
        name="Events"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
          title: "My Events",
        }}
      />

      {/* Inbox tab */}
      <Tabs.Screen
        name="Inbox"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble-outline" size={size} color={color} />
          ),
          title: "Inbox",
        }}
      />

      {/* Profile tab */}
      <Tabs.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          title: "Profile",
        }}
      />

      {/* Discover tab */}
      <Tabs.Screen
        name="Discover"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="myEventdetails/[id]" options={{ href: null }} />
      <Tabs.Screen name="UploadDocument" options={{ href: null }} />
      <Tabs.Screen name="ModifyCreate" options={{ href: null }} />

    </Tabs>



  );
}
