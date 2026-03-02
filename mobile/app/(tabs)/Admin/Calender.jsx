import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";

// Config and Hooks
import API_URL from "@/config";
import { useAdminCalendar } from "../../hooks/Admin/useCalender";
import { useAdminVenue } from "../../hooks/Admin/useVanue";

// ==========================================
// === 1. HELPERS & UTILS
// ==========================================

const safeParseDate = (dateString) => {
  if (!dateString) return new Date(NaN);
  if (dateString.includes("T")) return new Date(dateString);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString))
    return new Date(`${dateString}T00:00:00Z`);
  return new Date(dateString);
};

// Formats time for the Event Cards (e.g. 08:00 am - 10:00 am)
const formatTimeRange = (startIso, endIso) => {
  if (!startIso || !endIso) return "N/A";
  // Handle simple HH:mm strings if they are already formatted
  if (!startIso.includes('T') && startIso.includes(':')) return `${startIso} - ${endIso}`;

  const formatOptions = { hour: "2-digit", minute: "2-digit" };
  const startTime = new Date(startIso).toLocaleTimeString(undefined, formatOptions);
  const endTime = new Date(endIso).toLocaleTimeString(undefined, formatOptions);
  return `${startTime} - ${endTime}`;
};

// Helper: Formats Date object to "HH:mm" string (e.g. "08:00")
// This is crucial for Create.jsx compatibility
const formatToHHMM = (dateObj) => {
  if (!dateObj) return "00:00";
  // If it's already a string, just return it (sanitization)
  if (typeof dateObj === 'string') {
    if (dateObj.includes('T')) return dateObj.split('T')[1].substring(0, 5);
    return dateObj.substring(0, 5);
  }
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDateHeader = (dateString) => {
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const mapStatusToApproval = (event) => {
  const sortedApprovals = event.approvals
    ?.slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentApproval = sortedApprovals?.[0];

  if (currentApproval) {
    switch (currentApproval.status?.toUpperCase()) {
      case "APPROVED": return "Approved";
      case "REJECTED": return "Declined";
      case "PENDING": return "Waiting for Approval";
    }
  }
  const primaryStatus = event.status?.toUpperCase();
  if (primaryStatus === "PUBLISHED" || primaryStatus === "PENDING") return "Waiting for Approval";
  return "Waiting for Approval";
};

// ==========================================
// === 2. MAIN COMPONENT
// ==========================================

export default function AdminCalendar() {
  const { venues } = useAdminVenue();
  const { availableDates, addDates, reload } = useAdminCalendar();

  // Data State
  const [adminEvents, setAdminEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  // UI State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Availability Logic State
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [tempDates, setTempDates] = useState([]);
  const [availableModalVisible, setAvailableModalVisible] = useState(false);

  // Modal Form State
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState({ visible: false, mode: 'start' });

  // --- FETCH EVENTS ---
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");
      if (!token) return;

      const response = await fetch(`${API_URL}/admin/events`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed");
      const result = await response.json();
      const eventsData = Array.isArray(result.data) ? result.data : [];

      const processedEvents = eventsData.map((event) => ({
        ...event,
        title: event.name || event.title,
        approval: mapStatusToApproval(event),
        id: event.id || event.uuid,
        location: event.venue?.name || "Venue Name Missing",
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        organizer: event.organizer || { name: "Unknown", email: "" },
      }));

      setAdminEvents(processedEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // --- FILTER EVENTS ---
  useEffect(() => {
    const targetDate = selectedDate;
    const eventsOnDay = adminEvents.filter(e =>
      e.startDateTime.startsWith(targetDate)
    );
    setFilteredEvents(eventsOnDay);
  }, [selectedDate, adminEvents]);

  // --- BUILD CALENDAR DOTS ---
  useEffect(() => {
    const marks = {};

    // 1. Events 
    adminEvents.forEach((e) => {
      const dateStr = e.startDateTime.split('T')[0];
      let color = "#f59e0b";
      if (e.approval === "Approved") color = "#10b981";
      if (e.approval === "Declined") color = "#ef4444";

      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
      marks[dateStr].dots.push({ key: `evt-${e.id}`, color });
    });

    // 2. Available Slots (Blue Dots)
    availableDates.forEach((d) => {
      const dDate = d.date.includes('T') ? d.date.split('T')[0] : d.date;

      if (!marks[dDate]) marks[dDate] = { dots: [] };

      if (!marks[dDate].dots.some(dot => dot.color === "#2563eb")) {
        marks[dDate].dots.push({ key: `avail-${dDate}`, color: "#2563eb" });
      }
    });

    // 3. Multi-select styling
    tempDates.forEach(date => {
      if (!marks[date]) marks[date] = { dots: [] };
      marks[date] = {
        ...marks[date],
        selected: true,
        selectedColor: '#93c5fd',
        selectedTextColor: '#1e293b'
      };
    });

    // 4. Standard Selection styling
    if (!multiSelectMode) {
      Object.keys(marks).forEach(date => {
        marks[date].marked = true;
      });
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: "#2563eb",
        disableTouchEvent: false
      };
    } else {
      Object.keys(marks).forEach(date => {
        marks[date].marked = true;
      });
    }

    setMarkedDates(marks);
  }, [adminEvents, availableDates, selectedDate, tempDates, multiSelectMode]);

  // --- HANDLERS ---

  const handleDayPress = (day) => {
    const dateStr = day.dateString;

    if (multiSelectMode) {
      setTempDates(prev => {
        if (prev.includes(dateStr)) return prev.filter(d => d !== dateStr);
        return [...prev, dateStr];
      });
    } else {
      setSelectedDate(dateStr);

      // Check availability logic matching Create.jsx expectations
      const availSlot = availableDates.find(d => {
        const dDate = d.date.includes('T') ? d.date.split('T')[0] : d.date;
        return dDate === dateStr;
      });

      if (availSlot) {
        // Format for display in Alert
        // Note: We use the same formatting logic Create.jsx will likely see
        let sTime = availSlot.startTime;
        let eTime = availSlot.endTime;

        // If they are ISO, clean them up for the Alert
        if (sTime.includes('T')) sTime = formatToHHMM(sTime);
        else sTime = sTime.substring(0, 5); // Ensure HH:mm

        if (eTime.includes('T')) eTime = formatToHHMM(eTime);
        else eTime = eTime.substring(0, 5);

        Alert.alert(
          "Venue Available",
          `Available on ${dateStr}\nStart: ${sTime}\nEnd: ${eTime}`,
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const toggleVenueSelection = (venueId) => {
    setSelectedVenueIds(prev => {
      if (prev.includes(venueId)) return prev.filter(id => id !== venueId);
      return [...prev, venueId];
    });
  };

  const onTimeChange = (event, selectedDate) => {
    const mode = showTimePicker.mode;
    if (Platform.OS === 'android') setShowTimePicker({ ...showTimePicker, visible: false });

    if (selectedDate) {
      if (mode === 'start') setStartTime(selectedDate);
      else setEndTime(selectedDate);
    }
  };

  // --- SAVE LOGIC (FIXED: Formats to "HH:mm" for Create.jsx) ---
  const handleSaveAvailable = async () => {
    if (tempDates.length === 0) {
      Alert.alert("No Dates", "Please select at least one date on the calendar.");
      return;
    }
    if (selectedVenueIds.length === 0) {
      Alert.alert("No Venue", "Please select at least one venue.");
      return;
    }

    setLoading(true);
    try {
      // FIX: Format times to "HH:mm" strings.
      // Create.jsx checks: (startT >= entry.startTime)
      // Since startT is "HH:mm", entry.startTime MUST be "HH:mm" for this to work.
      const formattedStart = formatToHHMM(startTime);
      const formattedEnd = formatToHHMM(endTime);

      const newAvailabilities = tempDates.map(dateStr => ({
        date: dateStr,
        startTime: formattedStart, // Sends "08:00"
        endTime: formattedEnd,     // Sends "17:00"
        venueIds: selectedVenueIds
      }));

      await addDates(newAvailabilities);

      Alert.alert("Success", "Availability slots updated.");

      setMultiSelectMode(false);
      setTempDates([]);
      setSelectedVenueIds([]);
      setAvailableModalVisible(false);
      reload();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save availability.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // === 3. RENDER COMPONENT
  // ==========================================

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>

      {/* HEADER AREA */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={24} color="#1e293b" style={{ marginRight: 8 }} />
          <Text style={styles.mainHeader}>Admin Event Calendar</Text>
        </View>
        <TouchableOpacity style={styles.todayButton} onPress={handleSetToday}>
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* CALENDAR CARD */}
      <View style={styles.calendarCard}>
        <Calendar
          current={selectedDate}
          key={`${multiSelectMode}-${selectedDate}`}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#64748b',
            selectedDayBackgroundColor: '#2563eb',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#2563eb',
            dayTextColor: '#1e293b',
            textDisabledColor: '#cbd5e1',
            dotColor: '#00adf5',
            selectedDotColor: '#ffffff',
            arrowColor: '#1e293b',
            monthTextColor: '#1e293b',
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 14,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 12
          }}
        />
      </View>

      {/* ACTION BAR (For Availability) */}
      <View style={styles.actionBar}>
        <TouchableOpacity onPress={() => {
          setMultiSelectMode(!multiSelectMode);
          setTempDates([]);
        }}>
          <Text style={styles.linkText}>
            {multiSelectMode ? "Cancel Selection" : "+ Manage Availability"}
          </Text>
        </TouchableOpacity>
        {multiSelectMode && (
          <TouchableOpacity style={styles.saveBtn} onPress={() => setAvailableModalVisible(true)}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Set Availability ({tempDates.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* EVENTS LIST */}
      <View style={styles.listHeaderContainer}>
        <Text style={styles.listHeaderTitle}>Events on {formatDateHeader(selectedDate)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No events scheduled for this day.</Text>
        </View>
      ) : (
        filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))
      )}

      {/* === AVAILABILITY MODAL === */}
      <Modal visible={availableModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Add Availability Slots</Text>
            <Text style={styles.modalSubtitle}>You are adding slots for {tempDates.length} selected date(s).</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* 1. Venue Selection */}
              <Text style={styles.inputLabel}>Select Venues:</Text>
              <View style={styles.venueList}>
                {venues.map((venue) => {
                  const isSelected = selectedVenueIds.includes(venue.id);
                  return (
                    <TouchableOpacity
                      key={venue.id}
                      onPress={() => toggleVenueSelection(venue.id)}
                      style={[styles.venueChip, isSelected && styles.venueChipSelected]}
                    >
                      <Text style={[styles.venueChipText, isSelected && styles.venueChipTextSelected]}>
                        {venue.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={16} color="white" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* 2. Time Selection */}
              <Text style={styles.inputLabel}>Select Time Range:</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ visible: true, mode: 'start' })}
                  >
                    <Text style={styles.timeText}>
                      {formatToHHMM(startTime)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Ionicons name="arrow-forward" size={20} color="#94a3b8" style={{ marginTop: 20 }} />

                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker({ visible: true, mode: 'end' })}
                  >
                    <Text style={styles.timeText}>
                      {formatToHHMM(endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time Picker Component */}
              {showTimePicker.visible && (
                <DateTimePicker
                  value={showTimePicker.mode === 'start' ? startTime : endTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              {Platform.OS === 'ios' && showTimePicker.visible && (
                <TouchableOpacity
                  style={styles.iosClosePicker}
                  onPress={() => setShowTimePicker({ ...showTimePicker, visible: false })}
                >
                  <Text style={{ color: '#2563eb' }}>Done</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAvailableModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveAvailable}
              >
                <Text style={styles.confirmBtnText}>Save Availability</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ==========================================
// === 4. SUB-COMPONENTS
// ==========================================

const EventCard = ({ event }) => {
  const isApproved = event.approval === "Approved";
  const isDeclined = event.approval === "Declined";

  const borderColor = isApproved ? "#10b981" : isDeclined ? "#ef4444" : "#f59e0b";
  const statusBg = isApproved ? "#dcfce7" : isDeclined ? "#fee2e2" : "#fef3c7";
  const statusText = isApproved ? "#166534" : isDeclined ? "#991b1b" : "#92400e";

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTime}>
          {formatTimeRange(event.startDateTime, event.endDateTime)}
        </Text>
      </View>

      <Text style={styles.cardTitle}>{event.title}</Text>

      <View style={[styles.cardRow, { marginTop: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="location-sharp" size={16} color="#64748b" />
          <Text style={styles.cardLocation}>{event.location}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <Ionicons
            name={isApproved ? "checkmark-circle" : "ellipse"}
            size={12}
            color={borderColor}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusText, { color: statusText }]}>
            {event.approval}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ==========================================
// === 5. STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40
  },
  mainHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  todayButton: {
    backgroundColor: "white",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  todayText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600"
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10
  },
  listHeaderContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155"
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTime: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 13
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6
  },
  cardLocation: {
    color: "#64748b",
    fontSize: 13,
    marginLeft: 4
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // === MODAL STYLES ===
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 10 },

  venueList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  venueChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  venueChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  venueChipText: { fontSize: 13, color: '#475569' },
  venueChipTextSelected: { color: 'white', fontWeight: '600' },

  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  timeCol: { width: '45%' },
  timeLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  timeButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  timeText: { fontSize: 16, fontWeight: '600', color: '#334155' },

  iosClosePicker: { alignSelf: 'flex-end', padding: 10 },

  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15 },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
  confirmBtn: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  confirmBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});