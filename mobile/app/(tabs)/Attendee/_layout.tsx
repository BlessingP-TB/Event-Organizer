import { Tabs } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs>
      {/* orgaDash tab first, with title "Home" */}
      <Tabs.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          title: "Home",
        }}
      />

      {/* QR Code  */}
      <Tabs.Screen
        name="QrCode"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="camera" size={size} color={color} />,
          title: "QR Code",
          headerTitleAlign: 'center',
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
      {/* Events tab last */}
      <Tabs.Screen
        name="Events"
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
          title: "Events",
        }}
      />
      <Tabs.Screen name="RateEventPage" options={{ href: null }} />
      <Tabs.Screen name="EventDetails" options={{ href: null }} />
      <Tabs.Screen name="RegisterEvent" options={{ href: null }} />
      <Tabs.Screen name="eventdetails/[id]" options={{ href: null }} />
      <Tabs.Screen name="eventdetailsTicket/[id]" options={{ href: null }} />
    </Tabs>


  );
}
