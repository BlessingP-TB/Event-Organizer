// src/screens/Admin/AvailableVenues.js
import API_URL from "@/config"; // Ensure this path is correct in your project
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");

export default function AvailableVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Matches Web State Structure
  const [venueData, setVenueData] = useState({
    id: null,
    name: "",
    location: "",
    price: "",
    capacity: "",
    type: "", // AUDITORIUM, CLASSROOM, HALL, OTHER
    rateType: "PER_DAY", // PER_DAY, PER_HOUR
    images: [], // Stores URIs for display
    existingImages: [] // specific for edit logic if needed, or mixed
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);

  // --- 1. Fetch Logic (Matching Web Normalization) ---
  const fetchVenues = async () => {
    setLoading(true);
    try {
      // In native, we usually store JWT in AsyncStorage
      const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

      const res = await fetch(`${API_URL}/venues`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      // Logic from Web: Normalize the list
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.items)) list = data.items;
      else if (Array.isArray(data.data)) list = data.data;

      const normalized = list
        .filter((v) => v.id)
        .map((v) => ({
          id: v.id,
          name: v.name || "",
          location: v.location || "",
          price: Number(v.price) || 0,
          capacity: Number(v.capacity) || 0,
          type: v.type || "HALL",
          rateType: v.rateType || "PER_DAY",
          imageUrls: v.imageUrls || [],
        }));

      setVenues(normalized);
    } catch (err) {
      console.error("Failed to load venues:", err);
      Alert.alert("Error", "Failed to load venues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  // --- 2. Filter Logic ---
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues;
    const query = searchQuery.toLowerCase();
    return venues.filter(
      (venue) =>
        venue.location?.toLowerCase().includes(query) ||
        venue.name?.toLowerCase().includes(query)
    );
  }, [venues, searchQuery]);

  // --- 3. Modal & Image Handling ---
  const openModal = (venue = null) => {
    if (venue) {
      setVenueData({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        price: venue.price?.toString() || "",
        capacity: venue.capacity?.toString() || "",
        type: venue.type,
        rateType: venue.rateType,
        images: venue.imageUrls || [],
      });
      setEditId(venue.id);
    } else {
      setVenueData({
        id: null,
        name: "",
        location: "", // Default empty
        price: "",
        capacity: "",
        type: "", // Default empty
        rateType: "PER_DAY",
        images: [],
      });
      setEditId(null);
    }
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((a) => a.uri);
      setVenueData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const handleDeleteImage = (index) => {
    setVenueData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // --- 4. Save Logic (Matching Web FormData) ---
  const handleSave = async () => {
    if (!venueData.name || !venueData.location || !venueData.price || !venueData.capacity || !venueData.type) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

    // Construct FormData exactly like Web
    const formData = new FormData();
    formData.append("name", venueData.name);
    formData.append("location", venueData.location);
    formData.append("price", venueData.price);
    formData.append("capacity", venueData.capacity);
    formData.append("type", venueData.type);
    formData.append("rateType", venueData.rateType);

    // Handle Images for React Native FormData
    venueData.images.forEach((imgUri) => {
      // If it's a remote URL (string), the backend might not need it re-uploaded if logic handles it,
      // but if it's a local file (starts with file://), we append it.
      // Note: React Native FormData requires { uri, name, type }
      if (!imgUri.startsWith("http")) {
        const fileName = imgUri.split('/').pop();
        const fileType = fileName.split('.').pop();

        formData.append("imageFiles", {
          uri: imgUri,
          name: fileName,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }
    });

    try {
      let url = `${API_URL}/admin/venues`;
      let method = "POST";

      if (editId) {
        url = `${API_URL}/admin/venues/${editId}`;
        method = "PATCH"; // Web uses PATCH for edit
      }

      const res = await fetch(url, {
        method: method,
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data', // Often let the browser/native handle this boundary automatically
        },
      });

      if (res.ok) {
        setModalVisible(false);
        fetchVenues(); // Reload list
        Alert.alert("Success", editId ? "Venue updated successfully" : "Venue created successfully");
      } else {
        const errorText = await res.text();
        console.error("Server Error:", errorText);
        Alert.alert("Error", "Failed to save venue.");
      }
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Network request failed.");
    }
  };

  // --- 5. Delete Logic ---
  const handleDelete = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this venue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");
            await fetch(`${API_URL}/admin/venues/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchVenues();
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete venue");
          }
        },
      },
    ]);
  };

  // Helper component for simple option buttons (Simulating HTML <select>)
  const SelectionGroup = ({ label, options, selectedValue, onSelect }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectionRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.selectionChip,
              selectedValue === opt.value && styles.selectionChipActive
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[
              styles.selectionText,
              selectedValue === opt.value && styles.selectionTextActive
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Venues</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#0077B6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location"
          placeholderTextColor={"#999"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <MaterialCommunityIcons name="plus-circle" size={22} color="#fff" />
        <Text style={styles.addText}>Add Venue</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={filteredVenues}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? "Loading venues..." : "No venues available"}
          </Text>
        }
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Carousel matching Web Logic */}
            {item.imageUrls?.length > 0 ? (
              <Carousel
                width={width - 80} // adjusting for padding
                height={160}
                autoPlay={false}
                data={item.imageUrls}
                scrollAnimationDuration={1000}
                renderItem={({ item: imgUrl }) => (
                  <Image source={{ uri: imgUrl }} style={styles.carouselImage} />
                )}
              />
            ) : (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons name="image-off" size={40} color="#0077B6" />
              </View>
            )}

            <View style={styles.cardContent}>
              <Text style={styles.venueName}>{item.name}</Text>

              <View style={styles.row}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{item.location}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>R{item.price}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.detailLabel}>Capacity:</Text>
                <Text style={styles.detailValue}>{item.capacity}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{item.type}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.detailLabel}>Rate:</Text>
                <Text style={styles.detailValue}>{item.rateType.replace('_', ' ')}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                  <MaterialCommunityIcons name="pencil" size={18} color="#0077B6" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <MaterialCommunityIcons name="delete" size={18} color="red" />
                  <Text style={[styles.actionText, { color: 'red' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal Form */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.modalHeader}>{editId ? "Edit Venue" : "Add Venue"}</Text>

            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              <MaterialCommunityIcons name="camera-plus" size={30} color="#0077B6" />
              <Text style={{ color: "#0077B6", marginTop: 5 }}>Pick Images</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
              {venueData.images.map((img, i) => (
                <View key={i} style={styles.previewWrapper}>
                  <Image source={{ uri: img }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.deleteImageButton}
                    onPress={() => handleDeleteImage(i)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Inputs matching Web Fields */}
            <Text style={styles.label}>Venue Name</Text>
            <TextInput
              placeholder="e.g. Main Hall"
              value={venueData.name}
              onChangeText={(text) => setVenueData({ ...venueData, name: text })}
              style={styles.input}
            />

            <SelectionGroup
              label="Location"
              selectedValue={venueData.location}
              onSelect={(val) => setVenueData({ ...venueData, location: val })}
              options={[
                { label: 'Polokwane', value: 'Polokwane' },
                { label: 'Emalahleni', value: 'Emalahleni' },
              ]}
            />

            <SelectionGroup
              label="Venue Type"
              selectedValue={venueData.type}
              onSelect={(val) => setVenueData({ ...venueData, type: val })}
              options={[
                { label: 'Auditorium', value: 'AUDITORIUM' },
                { label: 'Classroom', value: 'CLASSROOM' },
                { label: 'Hall', value: 'HALL' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />

            <SelectionGroup
              label="Rate Type"
              selectedValue={venueData.rateType}
              onSelect={(val) => setVenueData({ ...venueData, rateType: val })}
              options={[
                { label: 'Per Day', value: 'PER_DAY' },
                { label: 'Per Hour', value: 'PER_HOUR' },
              ]}
            />

            <Text style={styles.label}>Price (R)</Text>
            <TextInput
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={venueData.price}
              onChangeText={(text) => setVenueData({ ...venueData, price: text })}
              style={styles.input}
            />

            <Text style={styles.label}>Capacity</Text>
            <TextInput
              placeholder="e.g. 100"
              keyboardType="numeric"
              value={venueData.capacity}
              onChangeText={(text) => setVenueData({ ...venueData, capacity: text })}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.buttonText}>{editId ? "Update" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", color: "#0077B6", marginBottom: 15 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    height: 45,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#333" },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0077B6",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 15,
  },
  addText: { color: "#fff", marginLeft: 8, fontWeight: "bold", fontSize: 16 },

  flatListContainer: { paddingBottom: 20 },
  emptyText: { textAlign: "center", marginTop: 40, color: "gray", fontSize: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselImage: { width: "100%", height: 160, borderRadius: 8 },
  placeholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: { marginTop: 12 },
  venueName: { fontSize: 18, fontWeight: "bold", color: "#0077B6", marginBottom: 8 },
  row: { flexDirection: "row", marginBottom: 4 },
  detailLabel: { fontWeight: "600", color: "#555", width: 70 },
  detailValue: { color: "#333", flex: 1 },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 4, fontWeight: '600', color: '#0077B6' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 12, padding: 20, maxHeight: "90%" },
  modalHeader: { fontSize: 20, fontWeight: "bold", color: "#0077B6", marginBottom: 15, textAlign: "center" },

  imagePicker: { alignItems: "center", padding: 15, borderWidth: 1, borderColor: "#0077B6", borderStyle: 'dashed', borderRadius: 8, marginBottom: 15 },
  previewScroll: { marginBottom: 15, height: 70 },
  previewWrapper: { marginRight: 10, position: 'relative' },
  previewImage: { width: 70, height: 70, borderRadius: 6 },
  deleteImageButton: { position: "absolute", top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },

  input: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },

  // Selection Group Styles
  inputGroup: { marginBottom: 15 },
  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0077B6',
    backgroundColor: 'white'
  },
  selectionChipActive: { backgroundColor: '#0077B6' },
  selectionText: { color: '#0077B6', fontSize: 12, fontWeight: '600' },
  selectionTextActive: { color: 'white' },

  modalButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  saveButton: { backgroundColor: "#0077B6" },
  cancelButton: { backgroundColor: "#888" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});