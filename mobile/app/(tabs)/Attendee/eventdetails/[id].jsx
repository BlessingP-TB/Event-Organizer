import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Adjust this path if necessary to match your project structure
import API_URL from "../../../../config";

// 👇 HELPER: Function to find ANY valid token in storage
// This prevents errors if you are logged in as an Admin/Organizer but trying to use Attendee features.
const getAnyAuthToken = async () => {
  const keys = [
    "ATTENDEE_JWT_TOKEN",
    "ORGANISER_JWT_TOKEN",
    "ADMIN_JWT_TOKEN",
    "authToken"
  ];

  for (const key of keys) {
    const token = await AsyncStorage.getItem(key);
    if (token) {
      console.log(`[Debug] Found token in key: ${key}`);
      return token;
    }
  }
  return null;
};

export default function EventDetails() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();

  const [event, setEvent] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    studentNumber: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeUpdates, setSubscribeUpdates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    checkRegistrationStatus();
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      // Use the helper here too for consistency
      const token = await getAnyAuthToken();
      const response = await axios.get(`${API_URL}/events/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (response.status === 200) {
        setEvent(response.data);
      } else {
        Alert.alert("Error", "Event not found.");
      }
    } catch (error) {
      console.error("Fetch event error:", error.response?.data || error.message);
      Alert.alert("Error", "Unable to fetch event details.");
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const registrations = await AsyncStorage.getItem(`registrations_${id}`);
      if (registrations) {
        const registrationList = JSON.parse(registrations);
        setIsAlreadyRegistered(registrationList.length > 0);
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 18 }}>
          Event not found
        </Text>
      </SafeAreaView>
    );
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions to continue');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 🟢 FIX: Retrieve the token using the robust helper
      const token = await getAnyAuthToken();

      if (!token) {
        Alert.alert("Authentication Required", "Please log in to register for events.");
        setLoading(false);
        return;
      }

      const registrationData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        studentNumber: formData.studentNumber,
        subscribeUpdates,
      };

      const response = await axios.post(
        `${API_URL}/events/${id}/registrations`,
        registrationData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        const existingRegs = await AsyncStorage.getItem(`registrations_${id}`);
        const registrationList = existingRegs ? JSON.parse(existingRegs) : [];
        registrationList.push(registrationData);
        await AsyncStorage.setItem(`registrations_${id}`, JSON.stringify(registrationList));

        setIsAlreadyRegistered(true);
        Alert.alert(
          "Registration Successful!",
          `Thank you ${formData.fullName}! You have successfully registered.`,
          [{ text: "OK", onPress: () => { setAcceptedTerms(false); setSubscribeUpdates(true); navigation.goBack(); } }]
        );
      } else {
        Alert.alert("Registration Failed", "Unexpected response from server.");
      }
    } catch (error) {
      console.error("Registration error:", error.response?.data || error.message);

      // 🟢 FIX: Handle Session Expiry (401) specifically
      if (error.response?.status === 401) {
        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please go to Profile > Logout, then Log In again."
        );
      } else {
        Alert.alert(
          "Registration Failed",
          error.response?.data?.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (event.organizer?.email || event.contact) {
      Linking.openURL(`mailto:${event.organizer?.email || event.contact}`);
    } else {
      Alert.alert("Contact", "No contact email available.");
    }
  };

  // Date formatting helpers
  const formatDateOnly = (isoString) => {
    if (!isoString) return 'Date not specified';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return 'Time not specified';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container2}>
        <Image source={{ uri: event.image }} style={styles.eventImage} />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category || "Event"}</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{formatDateOnly(event.startDateTime)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>
                {`${event.venue?.location || 'Venue'}${event.venue?.name ? `, ${event.venue.name}` : ''}`}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{formatTimeOnly(event.startDateTime)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{event.venue?.capacity || event.capacity || "N/A"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>Organized by: {event.organizer?.name || "Organizer"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>
                Price: {event.isFree ? 'Free' : (event.ticketDefinitions?.length > 0 ? 'Varies' : 'Paid')}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {Array.isArray(event.tags) && event.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <TouchableOpacity style={styles.contactRow} onPress={handleContact}>
              <Ionicons name="mail-outline" size={20} color="#0077B6" />
              <Text style={styles.contactText}>{event.organizer?.email || event.contact || "N/A"}</Text>
            </TouchableOpacity>
          </View>

          {!isAlreadyRegistered && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAcceptedTerms(!acceptedTerms)}>
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}>
                  {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.linkText}>Terms and Conditions</Text> and{' '}
                    <Text style={styles.linkText}>Privacy Policy</Text> *
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setSubscribeUpdates(!subscribeUpdates)}>
                <View style={[styles.checkbox, subscribeUpdates && styles.checkboxSelected]}>
                  {subscribeUpdates && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    Subscribe to event updates and notifications
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
            <Text style={styles.infoText}>
              You will receive a confirmation email with event details. Please bring your student ID to the event.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isAlreadyRegistered ? (
          <View style={styles.alreadyRegisteredContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#f3ef07ff" />
            <Text style={styles.alreadyRegisteredText}>Registered</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.registerButton, (!acceptedTerms || loading) && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={!acceptedTerms || loading}
          >
            {loading ? (
              <Text style={styles.registerButtonText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.registerButtonText}>Register Now</Text>
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  container2: { marginTop: -50 },
  eventImage: { width: '100%', height: 250 },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 10 },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#191823', flex: 1, marginRight: 10 },
  categoryBadge: { backgroundColor: '#EFEFEF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#0077B6' },
  detailsSection: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailText: { marginLeft: 12, fontSize: 16, color: '#333', flex: 1 },
  section: { backgroundColor: 'white', marginHorizontal: 0, marginTop: 15, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 24, color: '#666' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { backgroundColor: '#EFEFEF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  tagText: { fontSize: 14, color: '#0077B6', fontWeight: '500' },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8 },
  contactText: { marginLeft: 12, fontSize: 16, color: '#0077B6' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  checkboxTextContainer: { flex: 1 },
  checkboxText: { fontSize: 14, color: '#333', lineHeight: 20 },
  linkText: { color: '#0077B6', fontWeight: '600' },
  infoSection: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#e3f2fd', marginHorizontal: 0, marginTop: 15, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  infoText: { fontSize: 14, color: '#1976d2', marginLeft: 10, flex: 1, lineHeight: 18 },
  footer: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  registerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0077B6', paddingVertical: 16, borderRadius: 12 },
  registerButtonDisabled: { backgroundColor: '#ccc' },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  alreadyRegisteredContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0077B6', paddingVertical: 16, borderRadius: 12 },
  alreadyRegisteredText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});