
import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getOrganiserEvents } from '../../data/Organiser/myEvents';

const filters = [
  { label: "All", key: "all" },
  { label: "Pending", key: "Waiting for Approval" },
  { label: "Approved", key: "Approved" },
  { label: "Declined", key: "Declined" }
];

const notifications = [
  { id: '1', title: 'Event Registration Approved', message: 'Your registration to attend "Campus Fest" has been approved.', time: '2 min ago' },
  { id: '2', title: 'New Event', message: 'Register for new event.', time: '1 hour ago' },
  { id: '3', title: 'Event Registration Approved', message: 'Your registration to attend "Career Day" has been approved.', time: '3 hours ago' }
];

export default function Events() {
  const navigation = useNavigation();
  const router = useRouter();

  const [events, setEvents] = useState([]); // Manage events state
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for events

  // Load events
  const loadEvents = async () => {
    setIsLoading(true); // Show loading spinner
    try {
      const loadedEvents = await getOrganiserEvents(); // Fetch events using getOrganiserEvents from API
      setEvents(loadedEvents); // Set the loaded events to state
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setIsLoading(false); // Hide loading spinner
    }
  };

  // Automatically refresh when screen comes into focus (e.g. after modifying an event)
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  // Filter events based on selected filter
  useEffect(() => {
    setFilteredEvents(
      selectedFilter === "all"
        ? events
        : events.filter((event) => event.approval === selectedFilter)
    );
  }, [selectedFilter, events]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  return (
    <View style={styles.container}>
      {isNotificationOpen && (
        <View style={[styles.notificationDropdown, { top: Platform.OS === "ios" ? 60 : 40 }]}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)}>
              <AntDesign name="close" size={16} color="#999" />
            </TouchableOpacity>
          </View>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText2}>No new notifications</Text>
          ) : (
            <ScrollView style={styles.notificationList}>
              {notifications.map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationItemTitle}>{item.title}</Text>
                    <Text style={styles.notificationItemMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Events</Text>

        {/* Header Actions: Refresh Button & Notifications */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={loadEvents} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <Ionicons name="refresh" size={24} color="black" />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsNotificationOpen(!isNotificationOpen)}>
            <Ionicons name="notifications-outline" size={26} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(({ label, key }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, selectedFilter === key && styles.activeFilterButton]}
              onPress={() => setSelectedFilter(key)}
            >
              <Text style={[styles.filterText, selectedFilter === key && styles.activeFilterText]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sortByContainer}>
          <TouchableOpacity style={styles.sortByButton}>
            <Ionicons name="filter" size={20} color="#333" />
            <Text style={styles.sortByText}>Sort By</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Events</Text>

      {/* Show loading spinner if data is being fetched initially */}
      {isLoading && events.length === 0 ? (
        <ActivityIndicator size="large" color="#0077B6" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          style={styles.list}
          refreshing={isLoading}
          onRefresh={loadEvents}
          renderItem={({ item }) => (
            <Pressable
              style={styles.eventRow}
              onPress={() => router.push(`./myEventdetails/${item.id}`)} // Navigate to event details
            >
              <View style={styles.card}>
                <View style={styles.eventIconContainer}>
                  <Ionicons name="calendar-outline" size={32} color="#0077B6" />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventDate}>{item.displayDate}</Text>
                  {item.approval === "Waiting for Approval" && (
                    <Text style={{ color: "#b1adbc", fontWeight: "600", fontSize: 14, marginTop: 2 }}>
                      {item.approval || ""}
                    </Text>
                  )}
                  {item.approval === "Approved" && (
                    <Text style={styles.eventStatusPast}>Approved</Text>
                  )}
                  {item.approval === "Declined" && (
                    <Text style={styles.eventStatusCancelled}>Declined</Text>
                  )}
                </View>
                {item.approval === "Waiting for Approval" && (
                  <TouchableOpacity style={styles.modifyBtn} onPress={async () => {
                    await AsyncStorage.setItem('selectedEvent', JSON.stringify(item));
                    router.push('./ModifyCreate');
                  }}>
                    <Text style={styles.modifyBtnText}>Modify</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text>No events found in this category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafc" },
  notificationDropdown: {
    position: 'absolute', right: 12, width: 300, maxHeight: 320, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12,
    shadowRadius: 8, elevation: 5, zIndex: 1000, padding: 12,
  },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  notificationTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptyText2: { color: '#999', textAlign: 'center', fontStyle: 'italic', paddingVertical: 20 },
  notificationItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  notificationIcon: { marginRight: 12, marginTop: 4 },
  notificationContent: { flex: 1 },
  notificationItemTitle: { fontWeight: '600', fontSize: 14, color: '#333' },
  notificationItemMessage: { fontSize: 13, color: '#666', marginVertical: 4 },
  notificationTime: { fontSize: 11, color: '#999' },

  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 21,
    paddingTop: Platform.OS === 'ios' ? 54 : 28,
    paddingBottom: 11,
    backgroundColor: "#fff",
    zIndex: 10
  },
  headerTitle: { fontSize: 25, fontWeight: "700", color: "#191823" },

  filterBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 15, paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#ddd"
  },
  filterContent: { flexDirection: "row", justifyContent: "space-between" },
  filterButton: {
    marginRight: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, borderColor: "#ddd"
  },
  activeFilterButton: { backgroundColor: "#0077B6", borderColor: "#0077B6" },
  filterText: { fontSize: 14, color: "#333" },
  activeFilterText: { color: "#fff" },
  sortByContainer: { marginLeft: 'auto' },
  sortByButton: { flexDirection: "row", alignItems: "center" },
  sortByText: { marginLeft: 8, fontSize: 14, color: "#333" },

  sectionTitle: { fontSize: 22, fontWeight: '700', paddingHorizontal: 16, marginVertical: 15 },

  list: { paddingHorizontal: 16 },
  eventRow: { marginBottom: 20 },
  card: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#ddd", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
  },
  eventIconContainer: { marginRight: 16, justifyContent: "center" },
  eventDetails: { flex: 1 },
  eventTitle: { fontSize: 18, fontWeight: "600", color: "#191823" },
  eventDate: { fontSize: 14, color: "#777" },
  eventStatusPast: { color: "#0077B6", fontSize: 14, marginTop: 5 },
  eventStatusCancelled: { color: "#d9534f", fontSize: 14, marginTop: 5 },
  modifyBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: "#0077B6", justifyContent: "center", alignItems: "center"
  },
  modifyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 50 },
  loadingIndicator: { marginTop: 50 }
});
