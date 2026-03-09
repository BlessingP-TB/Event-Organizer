import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// NOTE: Make sure this path is correct based on where you moved your data files (e.g., if you moved them to 'src/')
import { getEvents, updateEvent } from "../../data/Organiser/myEvents";

const defaultImg = require("@/assets/images/TUT-Logo1.jpg");

const tabs = ["All", "Waiting for Approval", "Approved", "Declined"];

export default function Events() {
  const [selectedTab, setSelectedTab] = useState("Waiting for Approval");
  const [eventsData, setEventsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const navigation = useNavigation();
  const router = useRouter();

  // State for rejection reason modal
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false); // Processing state for API calls

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const rawEvents = await getEvents();
      // --- DEDUPLICATION LOGIC (Ensures only unique, latest status is shown) ---
      const uniqueEvents = {};
      rawEvents.forEach(event => {
        // Use event.id as the unique key
        uniqueEvents[event.id] = event;
      });
      // Set the final array of unique events
      setEventsData(Object.values(uniqueEvents));
    } catch (e) {
      console.error("Error fetching events:", e);
      // Optionally show a user alert
    } finally {
      setIsLoading(false);
    }
  };

  // FILTER: 1) tab 2) search
  const filteredEvents = useMemo(() => {
    const byTab =
      selectedTab === "All"
        ? eventsData
        : eventsData.filter((e) => e.approval === selectedTab);

    if (!searchQuery.trim()) return byTab;

    const q = searchQuery.toLowerCase();
    return byTab.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.organizer?.name?.toLowerCase().includes(q) || // FIX: search organizer by name
        e.organizer?.toLowerCase().includes(q) // Fallback for string organizer
    );
  }, [selectedTab, eventsData, searchQuery]);

  const getStatusColor = (approval) => {
    switch (approval) {
      case "Waiting for Approval":
        return { color: "#0077B6" };
      case "Approved":
        return { color: "#2e8b57" };
      case "Declined":
        return { color: "#c0392b" };
      default:
        return { color: "#555" };
    }
  };

  const renderEventCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-outline" size={26} color="#0077B6" />
          </View>
          <View style={styles.texts}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.requestId}>Request ID: {item.id}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={14} color="#777" />
              <Text style={styles.metaText}>{item.category}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar" size={14} color="#777" />
              <Text style={styles.metaText}>{item.displayDate}</Text>
            </View>
            <Text style={[styles.status, getStatusColor(item.approval)]}>
              {item.approval}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => setSelectedEvent(item)}
        >
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // 1. Update the status on the backend
      await updateEvent({ id: selectedEvent.id, approval: "Approved", status: "Published" });

      // 2. Re-fetch the updated event list
      await fetchEvents();

      // 3. Clear the details view
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to approve event:", error);
      alert("Failed to approve event. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to trigger the modal
  const promptForRejection = () => {
    setRejectionReason(""); // Reset reason on open
    setIsRejectModalVisible(true);
  };

  // Function to handle final rejection with a reason
  const handleFinalReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    setIsRejectModalVisible(false); // Close modal right away
    setIsProcessing(true); // Start processing indicator

    try {
      // 1. Update status on backend, passing the reason in 'notes'
      await updateEvent({
        id: selectedEvent.id,
        approval: "Declined",
        notes: rejectionReason, // Send the reason to the data layer
      });

      // 2. Re-fetch the updated event list
      await fetchEvents();

      // 3. Clear the details view
      setRejectionReason("");
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to reject event:", error);
      alert("Failed to reject event. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Modal component for rejection reason
  const renderRejectModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isRejectModalVisible}
      onRequestClose={() => setIsRejectModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>Reason for Rejection</Text>
          <TextInput
            style={styles.reasonInput}
            onChangeText={setRejectionReason}
            value={rejectionReason}
            placeholder="Enter reason for declining the event..."
            multiline={true}
            numberOfLines={4}
            maxLength={250}
          />
          <Text style={styles.charCount}>{250 - rejectionReason.length} characters left</Text>
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => {
                setIsRejectModalVisible(false);
                setRejectionReason("");
              }}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalConfirmBtn]}
              onPress={handleFinalReject}
              disabled={isProcessing}
            >
              <Text style={styles.modalBtnText}>Confirm Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );


  const renderDetailsView = () => {
    if (!selectedEvent) return null;
    const imageSource = selectedEvent.image || defaultImg;
    const isPending = selectedEvent.approval === "Waiting for Approval";

    // Safely extract organizer name and contact (email)
    const organizerName = typeof selectedEvent.organizer === 'object' && selectedEvent.organizer !== null
      ? selectedEvent.organizer.name
      : selectedEvent.organizer || 'N/A';

    const contactInfo = typeof selectedEvent.organizer === 'object' && selectedEvent.organizer !== null
      ? selectedEvent.organizer.email
      : selectedEvent.contact || 'N/A';

    // Get the most recent approval for notes (rejection reason)
    const sortedApprovals = selectedEvent.approvals
      ?.slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestNotes = sortedApprovals?.[0]?.notes;


    return (
      <ScrollView style={styles.detailsContainer}>
        {renderRejectModal()}

        <Image
          // Check if imageSource is an object with 'uri' (network image) or a number (local require)
          source={typeof imageSource === "string" ? { uri: imageSource } : imageSource}
          style={styles.eventImage}
          resizeMode="cover"
        />

        <Text style={styles.detailsHeader}>Event Details</Text>
        {/* CRITICAL FIX: Ensure ALL text is wrapped in <Text> tags */}
        <Text style={styles.detailsTitle}>{selectedEvent.title}</Text>
        <Text style={styles.detailsText}>Category: {selectedEvent.category || 'N/A'}</Text>
        <Text style={styles.detailsText}>Description:</Text>
        <Text style={styles.descriptionText}>{selectedEvent.description || 'No description provided.'}</Text>
        <Text style={styles.detailsText}>Capacity: {selectedEvent.capacity}</Text>
        <Text style={styles.detailsText}>Date: {selectedEvent.displayDate}</Text>
        <Text style={styles.detailsText}>Time: {selectedEvent.time}</Text>
        <Text style={styles.detailsText}>Duration: {selectedEvent.duration}</Text>
        <Text style={styles.detailsText}>Location: {selectedEvent.location}</Text>
        <Text style={styles.detailsText}>Price: {selectedEvent.price}</Text>

        <Text style={styles.detailsHeader}>Organizer Information</Text>
        <Text style={styles.detailsText}>Organizer: {organizerName}</Text>
        <Text style={styles.detailsText}>Contact: {contactInfo}</Text>

        {/* FIX: Handle missing/undefined tags array gracefully */}
        <Text style={styles.detailsText}>
          Tags: {selectedEvent.tags && Array.isArray(selectedEvent.tags) ? selectedEvent.tags.join(", ") : 'None'}
        </Text>

        <Text style={styles.detailsText}>
          Current Approval Status:
          <Text style={getStatusColor(selectedEvent.approval)}> {selectedEvent.approval}</Text>
        </Text>


        {/* Display rejection reason if declined and notes exist */}
        {selectedEvent.approval === "Declined" && latestNotes && (
          <View style={styles.rejectionReasonBox}>
            <Text style={styles.rejectionHeader}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{latestNotes}</Text>
          </View>
        )}

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.approveBtn, isProcessing && styles.disabledBtn]}
              onPress={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing && selectedEvent.id && selectedEvent.approval === "Waiting for Approval" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>Approve</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rejectBtn, isProcessing && styles.disabledBtn]}
              onPress={promptForRejection}
              disabled={isProcessing}
            >
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- AI REPORT BUTTON START --- */}
        {/* Only show AI Report if the event has started */}
        {new Date(selectedEvent.startDateTime) < new Date() && (
          <TouchableOpacity
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#0077B6",
              borderRadius: 10,
              padding: 14,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 15,
              marginBottom: 5,
            }}
            onPress={() => {
              router.push({
                pathname: "/(tabs)/Admin/EventAIReport",
                params: { eventId: selectedEvent.id },
              });
            }}
          >
            <MaterialIcons
              name="auto-awesome"
              size={20}
              color="#0077B6"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#0077B6", fontWeight: "700", fontSize: 16 }}>
              Generate AI Analysis
            </Text>
          </TouchableOpacity>
        )}
        {/* --- AI REPORT BUTTON END --- */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setSelectedEvent(null)}
          disabled={isProcessing}
        >
          <Text style={styles.backBtnText}>Back to List</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Loading event requests...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedEvent ? (
        renderDetailsView()
      ) : (
        <>
          <Text style={styles.header}>Event Requests</Text>

          {/* ====== SEARCH BAR ====== */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabsRow}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, selectedTab === tab && styles.activeTabBtn]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>{selectedTab}</Text>
          <Text style={styles.itemCount}>{filteredEvents.length} items</Text>
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={renderEventCard}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No events in this category</Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

/* =====================================================
  STYLES
  ===================================================== */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f4f4f4",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0077B6',
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 33,
    fontWeight: "900",
    color: "#191823",
    marginBottom: 14,
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#191823",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: "#0077B6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
    textAlign: "center",
  },
  activeTabText: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#191823",
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: "#0077B6",
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ececec",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    flex: 1,
  },
  iconCircle: {
    backgroundColor: "#f2f8ff",
    borderRadius: 40,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#191823",
  },
  requestId: {
    fontSize: 12,
    color: "#8e8e8e",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#555",
    marginLeft: 5,
  },
  status: {
    fontWeight: "700",
    fontSize: 14,
    marginTop: 6,
  },
  viewBtn: {
    backgroundColor: "#0077B6",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 10,
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#777",
  },
  // --- Details View Styles ---
  detailsContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailsHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#191823',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0077B6',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 15,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#2e8b57',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#c0392b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  backBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  // --- Rejection Reason Display Styles ---
  rejectionReasonBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fbeff1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  rejectionHeader: {
    fontWeight: '700',
    color: '#c0392b',
    marginBottom: 5,
    fontSize: 16,
  },
  rejectionText: {
    color: '#333',
    fontSize: 15,
  },
  // --- Rejection Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    color: '#191823',
  },
  reasonInput: {
    width: '100%',
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 5,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#777',
    marginBottom: 15,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelBtn: {
    backgroundColor: '#95a5a6',
  },
  modalConfirmBtn: {
    backgroundColor: '#c0392b',
  },
  modalBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});