// app/(tabs)/Organiser/myEventdetails/[id].jsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteEvent } from '../../../data/Organiser/myEvents';
import { useEventDetails } from '../../../hooks/organiser/useEventDetails';

const { width } = Dimensions.get('window');

// 1. IMPORT THE STATIC IMAGE
const singleImage = require('@/assets/images/one.jpg');

// --- THEME COLORS ---
const COLORS = {
  NAVY: '#002855',
  RED: '#E31837',
  GOLD: '#FFB81C',
  WHITE: '#FFFFFF',
  BG_GREY: '#F8F9FA',
  TEXT_DARK: '#333333',
  TEXT_LIGHT: '#666666'
};

// Helper to safely render values
const getSafeValue = (value, defaultText = 'N/A') => {
  if (typeof value === 'object' && value !== null) {
    if (value.name && typeof value.name === 'string') return value.name;
    try { return JSON.stringify(value); }
    catch { return '[Complex Data Error]'; }
  }
  return String(value || defaultText);
};

export default function EventDetails() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { event, loading } = useEventDetails(id);

  // Hide header
  useEffect(() => { navigation.setOptions({ headerShown: false }); }, []);

  const handleCancel = () => {
    if (!event?.id) return;
    Alert.alert(
      "Cancel Event Request?",
      "Are you sure you want to cancel this Event Request? This action is permanent.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Delete Event",
          style: "destructive",
          onPress: async () => {
            await deleteEvent(event.id);
            Alert.alert("Event Deleted", "Your event has been successfully cancelled.");
            router.push("../Events");
          }
        },
      ]
    );
  };

  const handleButtonPress = () => {
    if (!event?.id) return;
    router.push({ pathname: "../ModifyCreate", params: { eventId: event.id } });
  };

  // Navigation to Dashboard
  const handleBackToDashboard = () => {
    router.push('/(tabs)/Organiser/orgaDash');
  };

  // Date formatting helpers
  const formatDateOnly = (iso) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const formatTimeOnly = (iso) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.NAVY} />
      </View>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.notFoundText}>Event not found or failed to load.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("../Events")}>
          <Text style={styles.primaryButtonText}>Go Back to List</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const approvalStatus = String(event?.approvalStatus || "").toLowerCase();
  const showActionButtons =
    approvalStatus.includes("waiting for approval") ||
    approvalStatus.includes("pending") ||
    approvalStatus.includes("draft");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* --- HEADER IMAGE SECTION --- */}
        <View style={styles.imageContainer}>
          {/* 2. USE THE IMPORTED IMAGE HERE */}
          <Image source={singleImage} style={styles.eventImage} resizeMode="cover" />

          {/* Gradient Overlay for text readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Title on Image */}
          <View style={styles.imageTextContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getSafeValue(event.category)}</Text>
            </View>
            <Text style={styles.heroTitle}>{getSafeValue(event.title)}</Text>
          </View>
        </View>

        {/* --- CONTENT SHEET --- */}
        <View style={styles.sheetContainer}>

          {/* Status Bar */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: approvalStatus === 'approved' ? '#E7F6E7' : '#FFF4E5' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: approvalStatus === 'approved' ? '#22C55E' : '#F59E0B' }
              ]}>
                {getSafeValue(event.approvalStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Key Details Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar" size={20} color={COLORS.NAVY} />
              </View>
              <Text style={styles.gridLabel}>Date</Text>
              <Text style={styles.gridValue}>{formatDateOnly(event.startDateTime)}</Text>
            </View>

            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="time" size={20} color={COLORS.NAVY} />
              </View>
              <Text style={styles.gridLabel}>Time</Text>
              <Text style={styles.gridValue}>{formatTimeOnly(event.startDateTime)}</Text>
            </View>

            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={20} color={COLORS.NAVY} />
              </View>
              <Text style={styles.gridLabel}>Capacity</Text>
              <Text style={styles.gridValue}>{getSafeValue(event.capacity)}</Text>
            </View>
          </View>

          {/* Location Row */}
          <View style={styles.rowCard}>
            <Ionicons name="location" size={24} color={COLORS.RED} />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.rowLabel}>Location / Venue</Text>
              <Text style={styles.rowValue}>{getSafeValue(event.location)}</Text>
            </View>
          </View>

          {/* Organizer Row */}
          <View style={styles.rowCard}>
            <Ionicons name="business" size={24} color={COLORS.GOLD} />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.rowLabel}>Organizer</Text>
              <Text style={styles.rowValue}>{getSafeValue(event.organizer)}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{getSafeValue(event.description)}</Text>
          </View>

          {/* Tags */}
          {Array.isArray(event.tags) && event.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>#{getSafeValue(tag)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 3. REPLACED BUTTON: Back to Dashboard */}
          <TouchableOpacity style={styles.dashboardButton} onPress={handleBackToDashboard}>
            <Ionicons name="grid-outline" size={20} color="#FFF" />
            <Text style={styles.dashboardButtonText}>Back to Organizer Dashboard</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* --- BOTTOM ACTION BAR (Fixed) --- */}
      {showActionButtons && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Event</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modifyButton} onPress={handleButtonPress}>
            <Text style={styles.modifyButtonText}>Modify Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_GREY },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Image & Gradient
  imageContainer: { height: 320, width: '100%', position: 'relative' },
  eventImage: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    padding: 8,
    backdropFilter: 'blur(10px)'
  },

  // Text over Image
  imageTextContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.WHITE,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  categoryBadge: {
    backgroundColor: COLORS.GOLD,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: COLORS.NAVY,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase'
  },

  // Content Sheet
  sheetContainer: {
    marginTop: -30,
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 25,
    minHeight: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },

  // Status & Grid
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusLabel: { fontSize: 16, color: COLORS.TEXT_LIGHT, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: 'bold', fontSize: 14, textTransform: 'capitalize' },

  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  gridItem: { alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 45, height: 45, borderRadius: 25,
    backgroundColor: COLORS.BG_GREY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8
  },
  gridLabel: { fontSize: 12, color: COLORS.TEXT_LIGHT, marginBottom: 2 },
  gridValue: { fontSize: 14, color: COLORS.NAVY, fontWeight: '700' },

  // Rows
  rowCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.BG_GREY,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
  },
  rowLabel: { fontSize: 12, color: COLORS.TEXT_LIGHT },
  rowValue: { fontSize: 16, color: COLORS.TEXT_DARK, fontWeight: '600' },

  // Text Sections
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.NAVY, marginBottom: 10 },
  descriptionText: { fontSize: 15, lineHeight: 24, color: COLORS.TEXT_LIGHT },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    backgroundColor: COLORS.BG_GREY,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, marginRight: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#EEE'
  },
  tagText: { fontSize: 13, color: COLORS.NAVY, fontWeight: '500' },

  // DASHBOARD BUTTON STYLES
  dashboardButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.NAVY, paddingVertical: 15, borderRadius: 15,
    marginTop: 30, marginBottom: 20,
    shadowColor: COLORS.NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  dashboardButtonText: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 16, marginLeft: 10 },

  // Bottom Action Bar
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.WHITE,
    flexDirection: 'row', padding: 20,
    borderTopWidth: 1, borderTopColor: '#EEE',
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  cancelButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.WHITE, borderWidth: 1.5, borderColor: COLORS.RED,
    borderRadius: 30, paddingVertical: 14, marginRight: 10
  },
  cancelButtonText: { color: COLORS.RED, fontWeight: '700', fontSize: 15 },
  modifyButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.NAVY, borderRadius: 30, paddingVertical: 14
  },
  modifyButtonText: { color: COLORS.WHITE, fontWeight: '700', fontSize: 15 },

  // Fallback
  notFoundText: { fontSize: 18, color: '#666', marginBottom: 20, marginTop: 20 },
  primaryButton: { backgroundColor: COLORS.NAVY, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  primaryButtonText: { color: '#fff', fontWeight: 'bold' }
});