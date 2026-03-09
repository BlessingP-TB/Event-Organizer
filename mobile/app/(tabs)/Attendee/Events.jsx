import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useEvents } from '../../hooks/Attendee/useEvents';

const filters = [
  { label: 'All', key: 'all' },
  { label: 'Upcoming', key: 'Upcoming' },
  { label: 'Attended', key: 'Attended' },
  { label: 'Missed', key: 'Missed' },
];

const notifications = [
  { id: '1', title: 'Event Registration Approved', message: 'Your registration to attend "Campus Fest" has been approved.', time: '2 min ago' },
  { id: '2', title: 'New Event', message: 'Register for new event.', time: '1 hour ago' },
  { id: '3', title: 'Event Registration Approved', message: 'Your registration to attend "Career Day" has been approved.', time: '3 hours ago' },
];

export default function Events() {
  const { events } = useEvents();
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filteredEvents, setFilteredEvents] = useState(events);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(notifications.length);
  const router = useRouter();

  useEffect(() => {
    setFilteredEvents(
      selectedFilter === 'all'
        ? events
        : events.filter((event) => event.status === selectedFilter)
    );
  }, [selectedFilter, events]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const markAsRead = () => setUnreadCount(0);

  return (
    <View style={styles.container}>

      {/* NOTIFICATION DROPDOWN */}
      {isNotificationOpen && (
        <View style={[styles.notificationDropdown, { top: Platform.OS === 'ios' ? 60 : 40 }]}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)}>
              <AntDesign name="close" size={16} color="#999" />
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity style={styles.markReadBtn} onPress={markAsRead}>
            <Text style={styles.markReadTxt}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity onPress={() => setIsNotificationOpen(!isNotificationOpen)}>
          <View>
            <Ionicons name="notifications-outline" size={26} color="black" style={styles.headerIcon} />
            {unreadCount > 0 && <View style={styles.redDot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
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
      </View>

      {/* MAIN EVENT LIST */}
      <Text style={styles.sectionTitle}>Your Events</Text>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 30 }}
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.eventRow}
            // Prevent navigation for Attended or Missed status
            onPress={item.status === 'Attended' || item.status === 'Missed'
              ? undefined
              : () => router.push(`./eventdetails/${item.id}`)}
          >
            <View style={styles.leftCol}>
              <Ionicons name="calendar-outline" size={28} color="#0077B6" />
            </View>

            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{item.title}</Text>
              <Text style={styles.eventDate}>{item.date}</Text>
              <Text style={styles.eventStatus}>{item.status}</Text>
            </View>

            <View style={styles.rightCol}>

              {/* RATE EVENT BUTTON */}
              {item.status === 'Attended' && (
                <Pressable
                  style={styles.actionButtonGray}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: './RateEventPage',
                      params: { eventId: item.id, department: item.organizer, adminName: item.title }
                    });
                  }}
                >
                  <Text style={styles.actionTextGray}>Rate Event</Text>
                </Pressable>
              )}

              {/* TICKET BUTTON */}
              {(item.status === 'Upcoming' || item.status === 'Missed') && (
                <Pressable
                  style={item.status === 'Upcoming' ? styles.actionButton : styles.actionButtonTicketGray}
                  onPress={item.status === 'Upcoming'
                    ? (e) => {
                      e.stopPropagation();
                      // 👇 FIX: Passing eventId and eventName in params
                      router.push({
                        pathname: './QrCode',
                        params: { eventId: item.id, eventName: item.title }
                      });
                    }
                    : (e) => e.stopPropagation()}
                >
                  <Text style={item.status === 'Upcoming' ? styles.actionText : styles.actionTextTicketGray}>
                    Ticket
                  </Text>
                </Pressable>
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
    </View>
  );
}

// =============== STYLES (MODIFIED) ===============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },

  notificationDropdown: {
    position: 'absolute',
    right: 12,
    width: 300,
    maxHeight: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    padding: 12,
  },

  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  notificationTitle: { fontSize: 16, fontWeight: '600' },

  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  notificationIcon: { marginRight: 12, marginTop: 4 },

  notificationContent: { flex: 1 },

  notificationItemTitle: { fontWeight: '600', fontSize: 14 },

  notificationItemMessage: { fontSize: 13, color: '#666', marginVertical: 4 },

  notificationTime: { fontSize: 11, color: '#999' },

  markReadBtn: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#0077B6',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  markReadTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 21,
    paddingTop: Platform.OS === 'ios' ? 54 : 28,
    paddingBottom: 11,
    backgroundColor: '#fff',
    zIndex: 10,
  },

  headerTitle: { fontSize: 33, fontWeight: '900' },

  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
  },

  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 11,
    paddingBottom: 10,
  },

  filterContent: { flexDirection: 'row', alignItems: 'center' },

  filterButton: {
    marginRight: 11,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    paddingVertical: 11,
    paddingHorizontal: 24,
  },

  activeFilterButton: { backgroundColor: '#0077B6' },

  filterText: { fontSize: 17, fontWeight: '700' },

  activeFilterText: { color: '#fff' },

  sectionTitle: { fontSize: 22, fontWeight: '800', marginLeft: 17, marginTop: 12, marginBottom: 12 },

  list: { flex: 1 },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#fff',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
    paddingVertical: 16,
    paddingHorizontal: 19,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ececec',
  },

  leftCol: { marginRight: 10 },

  eventInfo: { flex: 1 },

  eventName: { fontSize: 17, fontWeight: '700' },

  eventDate: { fontSize: 14, color: '#0077B6' },

  eventStatus: { fontSize: 13, color: '#898' },

  rightCol: { marginLeft: 8, alignItems: 'flex-end' },

  actionButton: {
    backgroundColor: '#0077B6',
    borderRadius: 19,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
  },

  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  actionButtonTicketGray: {
    backgroundColor: '#ccc',
    borderRadius: 19,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },

  actionTextTicketGray: { color: '#666', fontWeight: '700', fontSize: 15 },

  actionButtonGray: {
    backgroundColor: '#f0f0f0',
    borderRadius: 19,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },

  actionTextGray: { color: '#0077B6', fontWeight: '700', fontSize: 15 },

  emptyBox: { padding: 25, alignItems: 'center' },
});