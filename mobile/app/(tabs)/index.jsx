import { Ionicons } from '@expo/vector-icons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// Ensure this path matches your folder structure
import { getApprovedEventsPublic } from "../data/Organiser/myEvents";

const { width, height } = Dimensions.get('window');

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();

  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Events');
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Modal & Alert State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // 1. Check Login Status
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const savedUser = await AsyncStorage.getItem("userSession");
        if (savedUser) {
          const user = JSON.parse(savedUser);
          const role = user.role?.toLowerCase();
          if (role === "organiser") router.replace("(tabs)/Organiser/orgaDash");
          else if (role === "admin") router.replace("(tabs)/Admin/adminDash");
          else router.replace("(tabs)/Attendee/Home");
          return;
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
      fetchPublicEvents();
    };
    checkLoginStatus();
  }, []);

  // 2. Fetch Events
  const fetchPublicEvents = async () => {
    try {
      const data = await getApprovedEventsPublic();
      if (data) {
        setEvents(data);
        setFilteredEvents(data);
      }
    } catch (error) {
      console.error("Failed to load public events:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Header Configuration
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <View style={style.headerContainer}>
          <View style={style.row}>
            <Text style={style.title}>Discover Events</Text>
            <TouchableOpacity onPress={() => router.push("/AuthScreen")}>
              <Text style={{ color: '#0077B6', fontWeight: 'bold' }}>Log In</Text>
            </TouchableOpacity>
          </View>
          <View style={style.searchBar}>
            <EvilIcons name="search" size={24} color="black" />
            <TextInput
              style={style.input}
              placeholder="Search public events..."
              placeholderTextColor={"#999"}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      ),
    });
  }, [search]);

  // ---------------------------------------------------------
  // 4. UPDATED FILTER LOGIC (Description Scanning)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!events) return;

    let filtered = events;

    // --- Category Filtering ---
    if (selectedCategory !== 'All Events') {
      filtered = filtered.filter(event => {
        // COMBINE ALL TEXT: We look at Title, Category, AND Description
        const fullText = (
          (event.category || '') + ' ' +
          (event.description || '') + ' ' +
          (event.title || '')
        ).toLowerCase();

        const selectedCat = selectedCategory.toLowerCase().trim();

        // Check strict match first (fastest)
        if (event.category && event.category.toLowerCase() === selectedCat) return true;

        // Check "Fuzzy" match inside Description/Title/Category
        // This ensures if description says "football", it appears in "Sport"
        if (selectedCat.includes('arts') && fullText.includes('arts')) return true;
        if (selectedCat.includes('culture') && fullText.includes('culture')) return true;

        if (selectedCat.includes('sport') && fullText.includes('sport')) return true;
        if (selectedCat.includes('sport') && fullText.includes('soccer')) return true; // Example synonym

        if (selectedCat.includes('tech') && fullText.includes('tech')) return true;
        if (selectedCat.includes('tech') && fullText.includes('computer')) return true; // Example synonym

        if (selectedCat.includes('academic') && fullText.includes('academic')) return true;
        if (selectedCat.includes('academic') && fullText.includes('lecture')) return true; // Example synonym

        return false;
      });
    }

    // --- Search Filtering (remains the same) ---
    if (search.trim()) {
      filtered = filtered.filter(event =>
        (event.title && event.title.toLowerCase().includes(search.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(search.toLowerCase())) ||
        (event.category && event.category.toLowerCase().includes(search.toLowerCase())) ||
        (event.description && event.description.toLowerCase().includes(search.toLowerCase())) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
      );
    }

    setFilteredEvents(filtered);
  }, [search, selectedCategory, events]);

  // Categories Definition
  const categories = [
    { id: 'all', name: 'All Events', icon: 'apps-sharp' },
    { id: 'academic', name: 'Academic', icon: 'school-outline' },
    { id: 'arts', name: 'Arts & Culture', icon: 'musical-notes-outline' },
    { id: 'sport', name: 'Sport', icon: 'football-outline' },
    { id: 'tech', name: 'Technology', icon: 'laptop-outline' },
  ];

  // Helper: Open Modal
  const handleOpenDetails = (event) => {
    setSelectedEvent(event);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleLoginRedirect = () => {
    setSelectedEvent(null);
    router.push("/AuthScreen");
  };

  const renderEventCard = ({ item }) => (
    <TouchableOpacity style={style.eventCard} onPress={() => handleOpenDetails(item)}>
      <Image
        source={item.image ? { uri: item.image } : require('@/assets/images/TUT-Logo1.jpg')}
        style={style.eventImage}
      />
      <View style={style.eventContent}>
        <Text style={style.categoryLabel}>{item.category || "General"}</Text>

        <Text style={style.eventTitle}>{item.title}</Text>

        {/* --- DATE FIX HERE --- */}
        <View style={style.eventMeta}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          {/* Changed item.date to item.displayDate to match your backend mapping */}
          <Text style={style.eventText}>{item.displayDate || item.date || "Date TBD"}</Text>
        </View>

        <View style={style.eventMeta}>
          <Ionicons name="location-outline" size={16} color="#888" />
          <Text style={style.eventText}>{item.location}</Text>
        </View>
        <Text style={style.viewDetailsText}>Tap to view details</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={style.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={style.container}>
      {/* Categories List */}
      <View style={style.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={style.categoriesContent}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                style.categoryButton,
                selectedCategory === item.name && style.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(item.name)}
            >
              <Ionicons
                name={item.icon}
                size={17}
                color={selectedCategory === item.name ? '#fff' : '#444'}
              />
              <Text style={[
                style.categoryText,
                selectedCategory === item.name && style.categoryTextActive
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main Event List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
        contentContainerStyle={style.eventsList}
        showsVerticalScrollIndicator={false}
      />

      {filteredEvents.length === 0 && (
        <View style={style.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={style.emptyText}>No events found for {selectedCategory}</Text>
        </View>
      )}

      {/* Event Details Modal */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={style.modalOverlay}>
          <View style={style.modalContent}>
            <TouchableOpacity
              style={style.closeButton}
              onPress={() => setSelectedEvent(null)}
            >
              <Ionicons name="close-circle" size={32} color="#333" />
            </TouchableOpacity>

            {selectedEvent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={selectedEvent.image ? { uri: selectedEvent.image } : require('@/assets/images/TUT-Logo1.jpg')}
                  style={style.modalImage}
                />

                <View style={style.modalBody}>
                  <Text style={style.modalTitle}>{selectedEvent.title}</Text>

                  <View style={style.infoRow}>
                    <Ionicons name="calendar" size={18} color="#0077B6" />
                    {/* Date Fix in Modal as well */}
                    <Text style={style.infoText}>{selectedEvent.displayDate || selectedEvent.date}</Text>
                  </View>
                  <View style={style.infoRow}>
                    <Ionicons name="time" size={18} color="#0077B6" />
                    <Text style={style.infoText}>{selectedEvent.time || "Time not specified"}</Text>
                  </View>
                  <View style={style.infoRow}>
                    <Ionicons name="location" size={18} color="#0077B6" />
                    <Text style={style.infoText}>{selectedEvent.location}</Text>
                  </View>

                  <Text style={style.sectionHeader}>Description</Text>
                  <Text style={style.descriptionText}>
                    {selectedEvent.description || "No description provided."}
                  </Text>

                  <TouchableOpacity style={style.loginButton} onPress={handleLoginRedirect}>
                    <Text style={style.loginButtonText}>Log In to Book Ticket</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {showToast && (
              <View style={style.toastContainer}>
                <Ionicons name="information-circle" size={24} color="#FFF" />
                <Text style={style.toastText}>
                  You must register or log in to book this event!
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const style = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerContainer: { paddingHorizontal: 15, paddingTop: 50, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 19, fontWeight: "600", color: "#181818" },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 20, paddingHorizontal: 12, margin: 5, height: 45 },
  input: { backgroundColor: '#f2f2f2', flex: 1, paddingHorizontal: 10, fontSize: 16, height: '100%', outlineStyle: 'none' },
  categoriesContainer: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f2f2f2", paddingVertical: 5 },
  categoriesContent: { paddingHorizontal: 17, paddingVertical: 6 },
  categoryButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFEFEF", paddingHorizontal: 17, paddingVertical: 8, borderRadius: 24, marginRight: 10 },
  categoryButtonActive: { backgroundColor: "#0077B6", borderWidth: 1, borderColor: "#0077B6" },
  categoryText: { marginLeft: 6, fontSize: 15, color: "#191823", fontWeight: "600" },
  categoryTextActive: { color: "#fff" },
  eventsList: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 18 },
  eventCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4, elevation: 3, overflow: "hidden" },
  eventImage: { width: "100%", height: 175, resizeMode: "cover" },
  eventContent: { padding: 16, paddingBottom: 16 },
  categoryLabel: { fontSize: 12, color: '#0077B6', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  eventTitle: { fontSize: 17.5, fontWeight: "700", marginBottom: 10, color: "#191823" },
  eventMeta: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  eventText: { marginLeft: 8, fontSize: 14.5, color: "#6a6a6a", flex: 1 },
  viewDetailsText: { marginTop: 8, fontSize: 12, color: '#0077B6', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 36 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#666', marginTop: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  modalImage: { width: '100%', height: 250, resizeMode: 'cover' },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { marginLeft: 10, fontSize: 16, color: '#555' },
  sectionHeader: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 8, color: '#181818' },
  descriptionText: { fontSize: 15, lineHeight: 24, color: '#666', marginBottom: 30 },
  loginButton: { flexDirection: 'row', backgroundColor: '#0077B6', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  toastContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#333', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  toastText: { color: '#FFF', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
});