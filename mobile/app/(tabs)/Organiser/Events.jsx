import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  cancelPublishedEvent,
  deleteNowEvent,
  getOrganiserEvents,
  isCancelledExpired,
  submitDraftEvent,
} from '../../../data/Organiser/myEvents';

const filters = [
  { label: 'All', key: 'ALL' },
  { label: 'Draft', key: 'DRAFT' },
  { label: 'Pending', key: 'PENDING' },
  { label: 'Published', key: 'PUBLISHED' },
  { label: 'Ongoing', key: 'ONGOING' },
  { label: 'Cancelled', key: 'CANCELLED' },
  { label: 'Completed', key: 'COMPLETED' },
];

const notifications = [
  { id: '1', title: 'Event Registration Approved', message: 'Your registration to attend "Campus Fest" has been approved.', time: '2 min ago' },
  { id: '2', title: 'New Event', message: 'Register for new event.', time: '1 hour ago' },
  { id: '3', title: 'Event Registration Approved', message: 'Your registration to attend "Career Day" has been approved.', time: '3 hours ago' },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'DRAFT':
      return '#475569';
    case 'PENDING':
      return '#a16207';
    case 'PUBLISHED':
      return '#1d4ed8';
    case 'ONGOING':
      return '#0369a1';
    case 'COMPLETED':
      return '#166534';
    case 'CANCELLED':
    case 'DELETED':
      return '#be123c';
    default:
      return '#6b7280';
  }
};

export default function Events() {
  const navigation = useNavigation();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const loadedEvents = await getOrganiserEvents();
      setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Error', 'Failed to load events.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const status = String(event.status || '').toUpperCase();
      const isCancelledLike = status === 'CANCELLED' || status === 'DELETED';

      if (selectedFilter === 'ALL') {
        return status !== 'DELETED';
      }

      if (selectedFilter === 'CANCELLED') {
        return isCancelledLike && !isCancelledExpired(event, nowMs);
      }

      return status === selectedFilter;
    });
  }, [events, selectedFilter, nowMs]);

  const handleDeleteNow = async (event) => {
    Alert.alert(
      'Delete Now?',
      'This will remove the cancelled event immediately from your cancelled list.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNowEvent(event.id);
              await loadEvents();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete now.');
            }
          },
        },
      ]
    );
  };

  const handleCancelPublished = async (event) => {
    Alert.prompt(
      'Cancel Event',
      'Enter a cancellation reason (min 5 characters):',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async (reason) => {
            const cleanReason = String(reason || '').trim();
            if (cleanReason.length < 5) {
              Alert.alert('Validation', 'Reason must be at least 5 characters.');
              return;
            }
            try {
              await cancelPublishedEvent(event.id, cleanReason);
              await loadEvents();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to cancel event.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSubmitDraft = async (event) => {
    try {
      await submitDraftEvent(event.id);
      Alert.alert('Success', 'Draft submitted for approval.');
      await loadEvents();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit draft.');
    }
  };

  return (
    <View style={styles.container}>
      {isNotificationOpen && (
        <View style={[styles.notificationDropdown, { top: Platform.OS === 'ios' ? 60 : 40 }]}> 
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
                    <Text style={styles.notificationItemMessage} numberOfLines={2}>{item.message}</Text>
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={loadEvents} disabled={isLoading}>
            {isLoading ? <ActivityIndicator size="small" color="black" /> : <Ionicons name="refresh" size={24} color="black" />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsNotificationOpen(!isNotificationOpen)}>
            <Ionicons name="notifications-outline" size={26} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {filters.map(({ label, key }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, selectedFilter === key && styles.activeFilterButton]}
              onPress={() => setSelectedFilter(key)}
            >
              <Text style={[styles.filterText, selectedFilter === key && styles.activeFilterText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.sectionTitle}>Your Events</Text>

      {isLoading && events.length === 0 ? (
        <ActivityIndicator size="large" color="#0077B6" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 30 }}
          style={styles.list}
          refreshing={isLoading}
          onRefresh={loadEvents}
          renderItem={({ item }) => {
            const status = String(item.status || '').toUpperCase();
            const isDeleted = Boolean(item.isDeleted || item.deletedAt);
            const isCancelledLike = status === 'CANCELLED' || status === 'DELETED' || item.isCancelledLike;

            return (
              <Pressable
                style={styles.eventRow}
                onPress={() => {
                  if (isDeleted) return;
                  router.push(`./myEventdetails/${item.id}`);
                }}
              >
                <View style={[styles.card, isDeleted && styles.deletedCard]}>
                  <View style={styles.eventIconContainer}>
                    <Ionicons name="calendar-outline" size={32} color="#0077B6" />
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventDate}>{item.displayDate}</Text>
                    <Text style={[styles.statusText, { color: getStatusColor(status) }]}>{status}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  {status === 'DRAFT' && (
                    <TouchableOpacity
                      style={styles.modifyBtn}
                      onPress={async () => {
                        await AsyncStorage.setItem('selectedEvent', JSON.stringify(item));
                        router.push('./ModifyCreate');
                      }}
                    >
                      <Text style={styles.modifyBtnText}>Continue</Text>
                    </TouchableOpacity>
                  )}

                  {status === 'DRAFT' && (
                    <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmitDraft(item)}>
                      <Text style={styles.submitBtnText}>Submit Draft</Text>
                    </TouchableOpacity>
                  )}

                  {status === 'PENDING' && (
                    <TouchableOpacity
                      style={styles.modifyBtn}
                      onPress={async () => {
                        await AsyncStorage.setItem('selectedEvent', JSON.stringify(item));
                        router.push('./ModifyCreate');
                      }}
                    >
                      <Text style={styles.modifyBtnText}>Modify</Text>
                    </TouchableOpacity>
                  )}

                  {status === 'PUBLISHED' && (
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => router.push({ pathname: '/(tabs)/Organiser/WrittenAssign', params: { eventId: item.id, eventName: item.title } })}
                    >
                      <Text style={styles.assignBtnText}>Written Assign</Text>
                    </TouchableOpacity>
                  )}

                  {status === 'PUBLISHED' && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelPublished(item)}>
                      <Text style={styles.cancelBtnText}>Cancel Event</Text>
                    </TouchableOpacity>
                  )}

                  {isCancelledLike && (
                    <TouchableOpacity style={styles.deleteNowBtn} onPress={() => handleDeleteNow(item)}>
                      <Text style={styles.deleteNowBtnText}>Delete Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            );
          }}
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
  container: { flex: 1, backgroundColor: '#fafafc' },
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 21,
    paddingTop: Platform.OS === 'ios' ? 54 : 28,
    paddingBottom: 11,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTitle: { fontSize: 25, fontWeight: '700', color: '#191823' },

  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  filterContent: { flexDirection: 'row', justifyContent: 'space-between' },
  filterButton: {
    marginRight: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, borderColor: '#ddd',
  },
  activeFilterButton: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  filterText: { fontSize: 14, color: '#333' },
  activeFilterText: { color: '#fff' },

  sectionTitle: { fontSize: 22, fontWeight: '700', paddingHorizontal: 16, marginVertical: 15 },

  list: { paddingHorizontal: 16 },
  eventRow: { marginBottom: 20 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#ddd', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  deletedCard: { opacity: 0.7 },
  eventIconContainer: { marginRight: 16, justifyContent: 'center' },
  eventDetails: { flex: 1 },
  eventTitle: { fontSize: 18, fontWeight: '600', color: '#191823' },
  eventDate: { fontSize: 14, color: '#777' },
  statusText: { marginTop: 4, fontWeight: '700', fontSize: 13 },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  modifyBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#0077B6', justifyContent: 'center', alignItems: 'center',
  },
  modifyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  submitBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
  },
  submitBtnText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },

  assignBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe',
  },
  assignBtnText: { color: '#5b21b6', fontWeight: '600', fontSize: 13 },

  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
  },
  cancelBtnText: { color: '#be123c', fontWeight: '600', fontSize: 13 },

  deleteNowBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
  },
  deleteNowBtnText: { color: '#be123c', fontWeight: '700', fontSize: 13 },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  loadingIndicator: { marginTop: 50 },
});
