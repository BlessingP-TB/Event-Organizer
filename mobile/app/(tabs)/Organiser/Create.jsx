// app/(tabs)/Organiser/Create.jsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
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
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure this is installed

import { createEventAPI, updateEventAPI } from '../../data/Organiser/myEvents';
import { useEvents } from '../../hooks/organiser/useMyEvents';
import { useOrganiserCalendar } from "../../hooks/organiser/useOrganiserCalendar";
import { useOrganiserVenue } from "../../hooks/organiser/useOrganiserVenue";
import { useProfileData } from "../../hooks/organiser/useprofileData";

/* --------------------------
   Constants
   -------------------------- */
const KNOWN_SERVICES = ['Liquor', 'Kitchen Facilities', 'Cleaning Services', 'Extra Security Guard'];

const eventTypes = ["Official", "Academic related", "Private", "External", "Student"];
const guestTypes = ["VIP", "Media", "Staff", "Student", "Special protocol required"];

const termsText = `VENUE BOOKING APPLICATION
The institution may grant the APPLICANT permission to use the following in terms of the conditions set out:
• Facilities for sport are booked through the Sport Division (012) 382-5399/4121
• Residence facilities are booked through the Residence Division (012) 382-4856
• Promotional events on campus are booked through Corporate Affairs and Marketing (012) 382-6542
On approval of an application, both parties should complete, sign and date the form.
CONDITIONS:
1. Only someone who has been duly authorised may sign the AA02 form.
2. Cancellations should be made in writing to the Facility Management Office at least five workdays before the relevant function starts.
3. The APPLICANT is responsible for all costs as determined by the institution.
4. The APPLICANT indemnifies the institution against any claims, losses, damages, or liabilities arising from the use of the venue.
5. The APPLICANT must ensure that the venue is left in the same condition as received.
6. No alterations, additions, or modifications may be made to the venue without prior written consent.
7. The institution reserves the right to cancel or reschedule bookings with reasonable notice.
8. All applicable laws, regulations, and institutional policies must be adhered to during the event.
9. The APPLICANT is responsible for obtaining any necessary licenses or permits.
10. Payment terms must be adhered to as specified in the booking agreement.
By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all conditions set forth in this venue booking application.`;

/* --------------------------
   Image Slider (small re-usable)
   -------------------------- */
const ImageSlider = ({ images = [] }) => {
  const safeImages = images && images.length > 0 ? images : ["https://via.placeholder.com/300x200?text=No+Image"];
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => setCurrentIndex(prev => (prev === safeImages.length - 1 ? 0 : prev + 1));
  const prevImage = () => setCurrentIndex(prev => (prev === 0 ? safeImages.length - 1 : prev - 1));

  return (
    <View style={styles.sliderContainer}>
      <Image source={{ uri: safeImages[currentIndex] }} style={styles.sliderImage} />
      <TouchableOpacity style={[styles.arrowButton, styles.leftArrow]} onPress={prevImage}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.arrowButton, styles.rightArrow]} onPress={nextImage}>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

/* --------------------------
   Main Component
   -------------------------- */
export default function Create() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const eventId = params?.eventId || params?.id || null;
  const isEdit = !!eventId;

  // Hooks
  const {
    rawCalendar = [],
    markedDates = {},
    reload: reloadCalendar
  } = useOrganiserCalendar();

  const availableDates = Array.isArray(rawCalendar) ? rawCalendar : [];
  const { venues = [], reload: reloadVenues } = useOrganiserVenue();
  const { getEventById } = useEvents();
  const profile = useProfileData();

  // Form state
  const [viewType, setViewType] = useState("grid");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [selectedGuestTypes, setSelectedGuestTypes] = useState([]);
  const [eventName, setEventName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [capacity, setCapacity] = useState("0");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [uploadedBanner, setUploadedBanner] = useState(null);

  // Modal States
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Tools Modal State (View Venue Tools)
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [currentVenueTools, setCurrentVenueTools] = useState([]);
  const [currentVenueName, setCurrentVenueName] = useState("");

  const [selectedStartTime, setSelectedStartTime] = useState(new Date());
  const [selectedEndTime, setSelectedEndTime] = useState(new Date());
  const [campus, setCampus] = useState("Emalahleni");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const currentDate = new Date().toISOString().split('T')[0];

  // --- NEW: Dynamic Resources State (Unified for Tools & Services) ---
  const [resources, setResources] = useState({});
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  const [availableDateDetails, setAvailableDateDetails] = useState({});
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- FETCH TOOLS ON MOUNT ---
  useEffect(() => {
    const fetchTools = async () => {
      setIsLoadingTools(true);
      try {
        // Retrieve token if your API needs it
        const token = await AsyncStorage.getItem('accessToken');

        // NOTE: In React Native Android Emulator, 'localhost' points to the device itself.
        // Use '10.0.2.2' for Android emulator to reach your computer's localhost, 
        // or your machine's LAN IP (e.g., 192.168.x.x) for physical devices.
        // Keeping the URL as requested in the prompt, but be aware of this in RN environment.
        const res = await fetch('http://localhost:3000/tools', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        const toolsData = json.data || json || [];
        const toolNames = Array.isArray(toolsData) ? toolsData.map(t => t.name).filter(Boolean) : [];

        // Initialize resources: number for tools, boolean for known services
        const initialResources = {};
        toolNames.forEach(name => {
          initialResources[name] = 0;
        });
        KNOWN_SERVICES.forEach(s => {
          if (!Object.prototype.hasOwnProperty.call(initialResources, s)) {
            initialResources[s] = false;
          }
        });

        setResources(initialResources);
      } catch (err) {
        console.error('Failed to fetch tools:', err);
        // Fallback to services only if tools fetch fails
        const fallback = {};
        KNOWN_SERVICES.forEach(s => fallback[s] = false);
        setResources(fallback);
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
    reloadVenues?.();
    reloadCalendar?.();
  }, []);

  useEffect(() => {
    if (!selectedVenue && Array.isArray(venues) && venues.length > 0) {
      setSelectedVenue(venues[0].id ?? venues[0].venueId ?? null);
    }
  }, [venues]);

  useEffect(() => {
    if (isEdit) {
      const eventToEdit = getEventById?.(eventId);
      if (eventToEdit) {
        setEventName(eventToEdit.title || eventToEdit.name || "");
        setPurpose(eventToEdit.description || "");
        const cap = (eventToEdit.capacity || eventToEdit.expectedAttend || "0").toString();
        setCapacity(cap.replace(' attendees', ''));
        setTermsAccepted(true);
        setDate(eventToEdit.displayDate || (eventToEdit.startDateTime ? eventToEdit.startDateTime.split('T')[0] : ""));
        if (eventToEdit.startDateTime) {
          const s = eventToEdit.startDateTime.split('T')[1]?.slice(0, 5);
          if (s) setStartTime(s);
        }
        if (eventToEdit.endDateTime) {
          const e = eventToEdit.endDateTime.split('T')[1]?.slice(0, 5);
          if (e) setEndTime(e);
        }
        const extractedCampus = extractCampusFromLocation(eventToEdit.location || "");
        setCampus(extractedCampus);
        const match = venues.find(v => v.location === eventToEdit.location || v.title === eventToEdit.location || v.id === eventToEdit.venueId);
        setSelectedVenue(match ? (match.id ?? match.venueId) : (eventToEdit.venueId ?? eventToEdit.venue));
        setSelectedEventTypes(eventToEdit.tags || []);
        setSelectedGuestTypes(eventToEdit.guestTypes || []);

        // Reconstruct resources state from edit data
        // This logic merges existing API resource data into the dynamic state
        const updatedResources = { ...resources };

        // Map numeric tools
        (eventToEdit.resources || []).forEach(res => {
          updatedResources[res.name] = res.quantity;
        });

        // Map services
        if (eventToEdit.services) {
          Object.keys(eventToEdit.services).forEach(key => {
            updatedResources[key] = eventToEdit.services[key];
          });
        }
        setResources(updatedResources);

        if (eventToEdit.bannerUri) setUploadedBanner({ uri: eventToEdit.bannerUri });
      }
    }
  }, [isEdit, eventId, venues]); // Removed resources dependency to prevent overwrite loop

  const extractCampusFromLocation = (location) => {
    if (!location) return "Emalahleni";
    const campuses = ["Emalahleni", "Polokwane", "Ga-Rankuwa", "Pretoria", "Soshanguve"];
    return campuses.find(c => location.includes(c)) || "Emalahleni";
  };

  // --- NEW: Handle Resource Changes ---
  const handleResourceChange = (resourceName, newValue) => {
    setResources(prev => {
      const isService = KNOWN_SERVICES.includes(resourceName);
      let normalized;
      if (isService) {
        // Ensure boolean
        normalized = !!newValue;
      } else {
        // Numeric tool
        if (typeof newValue === 'string') normalized = parseInt(newValue, 10) || 0;
        else if (typeof newValue === 'number') normalized = Math.max(0, Math.floor(newValue));
        else normalized = 0;
      }
      return { ...prev, [resourceName]: normalized };
    });
  };

  const incCapacity = () => setCapacity(c => (parseInt(c) || 0) + 1 + "");
  const decCapacity = () => setCapacity(c => Math.max((parseInt(c) || 0) - 1, 0) + "");

  const pickDocument = async (setter) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({});
      if (res && res.uri) {
        setter(res);
      } else if (res?.assets && res.assets[0]?.uri) {
        setter(res.assets[0]);
      }
    } catch (err) {
      console.error("Document pick error:", err);
    }
  };

  useEffect(() => {
    const marks = {};
    const details = {};
    (availableDates || []).forEach(item => {
      if (!item) return;
      const dateStr = (item.date || (item.startDateTime ? item.startDateTime.split('T')[0] : undefined));
      if (!dateStr) return;
      marks[dateStr] = marks[dateStr] || { marked: true, dotColor: "blue" };
      details[dateStr] = details[dateStr] || item;
    });
    setAvailableDateDetails(details);
  }, [availableDates, selectedVenue]);

  const isVenueAvailableLocal = (venueId, dateStr, startT, endT) => {
    if (!venueId || !dateStr) return false;
    return (availableDates || []).some(entry => {
      if (!entry?.date) return false;
      const entryDate = entry.date.split('T')[0];
      const matchesDate = entryDate === dateStr;
      const matchesVenue = entry.venueIds?.includes(String(venueId)) || String(entry.venueId) === String(venueId);
      const matchesTime = (startT >= (entry.startTime || "00:00")) && (endT <= (entry.endTime || "23:59"));
      return matchesDate && matchesVenue && matchesTime;
    });
  };

  const validateAvailability = () => {
    if (!selectedVenue) {
      setAvailabilityError("Please select a venue.");
      return false;
    }
    if (!date) {
      setAvailabilityError("Please select a date.");
      return false;
    }
    if (!startTime || !endTime) {
      setAvailabilityError("Please select start and end time.");
      return false;
    }
    const available = isVenueAvailableLocal(selectedVenue, date, startTime, endTime);
    if (!available) {
      setAvailabilityError("This venue is not available on the selected date/time. Choose another or contact admin.");
      return false;
    }
    setAvailabilityError("");
    return true;
  };

  useEffect(() => {
    if (selectedVenue && date && startTime && endTime) {
      validateAvailability();
    } else {
      setAvailabilityError("");
    }
  }, [selectedVenue, date, startTime, endTime]);

  const safeMarkedDates = (markedDates && typeof markedDates === "object") ? markedDates : {};
  const mergedMarkedDates = useMemo(() => {
    const m = { ...safeMarkedDates };
    (availableDates || []).forEach(item => {
      if (!item?.date) return;
      const d = item.date.split('T')[0];
      const matchesVenue = (Array.isArray(item.venueIds) && item.venueIds.includes(String(selectedVenue))) ||
        (item.venueId && String(item.venueId) === String(selectedVenue));
      if (matchesVenue) {
        m[d] = { ...(m[d] || {}), marked: true, dotColor: "blue" };
      }
    });
    if (date) {
      m[date] = { ...(m[date] || {}), selected: true, selectedColor: "#0077B6" };
    }
    return m;
  }, [safeMarkedDates, availableDates, selectedVenue, date]);

  const canSubmit = !!(selectedVenue && date && startTime && endTime && termsAccepted && !availabilityError && eventName && purpose && capacity);

  const handleSubmit = async () => {
    if (!validateAvailability()) {
      Alert.alert("Availability Error", availabilityError || "Selected time not available");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Terms", "Please accept the terms and conditions.");
      return;
    }
    if (!eventName || !purpose || !capacity) {
      Alert.alert("Missing fields", "Please fill required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const startParts = startTime.split(':');
      const endParts = endTime.split(':');
      const eventDateObj = new Date(date);
      const startDateObj = new Date(eventDateObj);
      startDateObj.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
      const endDateObj = new Date(eventDateObj);
      endDateObj.setHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0, 0);

      const isEventFree = true;
      const autoDistribute = true;
      const eventCapacity = parseInt(capacity) || 1000;

      // --- Build Payload based on Code 2 Logic ---
      const numericResourcesArray = [];
      const servicesObject = {};

      Object.entries(resources).forEach(([name, value]) => {
        if (KNOWN_SERVICES.includes(name)) {
          servicesObject[name] = !!value;
        } else {
          const qty = parseInt(value, 10) || 0;
          if (qty > 0) numericResourcesArray.push({ name, quantity: qty });
        }
      });

      const apiPayload = {
        name: eventName,
        description: purpose,
        expectedAttend: eventCapacity,
        venueId: selectedVenue,
        startDateTime: startDateObj.toISOString(),
        endDateTime: endDateObj.toISOString(),
        isFree: isEventFree,
        ticketRequired: true,
        autoDistribute: autoDistribute,
        allowAttendeePurchase: true,
        resources: numericResourcesArray,
        services: servicesObject,
        ticketDefinitions: isEventFree ? undefined : [{
          name: "General Admission",
          price: 0.00,
          quantity: eventCapacity,
        }],
      };

      console.log("Submitting Payload:", apiPayload);

      if (isEdit) {
        await updateEventAPI(eventId, apiPayload);
        Alert.alert("Success", "Your event has been updated!", [{ text: "OK", onPress: () => { resetForm(); router.push("./Events"); } }]);
      } else {
        await createEventAPI(apiPayload);
        Alert.alert("Success", "Your event has been submitted!", [{ text: "OK", onPress: () => { resetForm(); router.push("./Events"); } }]);
      }

      reloadCalendar?.();
      reloadVenues?.();
    } catch (err) {
      console.error("Submission error:", err);
      Alert.alert("Error", err?.message || "Failed to save your event.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setEventName("");
    setPurpose("");
    setCapacity("0");
    setDate("");
    setStartTime("");
    setEndTime("");
    setCampus("Emalahleni");
    setSelectedVenue(venues.length > 0 ? (venues[0].id ?? venues[0].venueId) : null);
    setSelectedEventTypes([]);
    setSelectedGuestTypes([]);
    setUploadedBanner(null);
    setTermsAccepted(false);

    // Reset resources
    const resetResources = {};
    Object.keys(resources).forEach(k => {
      if (KNOWN_SERVICES.includes(k)) resetResources[k] = false;
      else resetResources[k] = 0;
    });
    setResources(resetResources);

    setViewType("grid");
  };

  const handleDayPress = (day) => {
    const selected = day?.dateString;
    if (!selected) return;
    const avail = availableDateDetails[selected];
    if (avail) {
      const matchesVenue = (Array.isArray(avail.venueIds) && avail.venueIds.includes(String(selectedVenue))) || String(avail.venueId) === String(selectedVenue);
      if (matchesVenue) {
        Alert.alert("Venue Available", `Available on ${selected}\nStart: ${avail.startTime}\nEnd: ${avail.endTime}`, [{ text: "OK", onPress: () => setDate(selected) }]);
        return;
      }
    }
    Alert.alert("Not Available", "This date is not available for the selected venue.");
  };

  // Handle Viewing Tools
  const handleViewTools = (venue) => {
    setCurrentVenueTools(venue.tools || []);
    setCurrentVenueName(venue.title || venue.name || "Venue");
    setShowToolsModal(true);
  };

  const filteredVenues = useMemo(() => {
    const capacityNum = parseInt(capacity, 10) || 0;
    const query = campus?.toLowerCase?.()?.trim?.() || "";
    return (venues || []).filter(v => {
      const matchesLocation = !query || (v.location || "").toLowerCase().includes(query) || (v.title || "").toLowerCase().includes(query);
      const matchesCapacity = capacityNum === 0 || (v.capacity >= capacityNum);
      return matchesLocation && matchesCapacity;
    });
  }, [venues, campus, capacity]);

  // --- Group resources for UI rendering ---
  const toolResources = {};
  const serviceResources = {};
  Object.entries(resources).forEach(([name, value]) => {
    if (KNOWN_SERVICES.includes(name)) serviceResources[name] = !!value;
    else toolResources[name] = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  });

  const renderVenueGrid = () => {
    if (!Array.isArray(filteredVenues) || filteredVenues.length === 0) {
      return (
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#be1922", fontSize: 16, fontWeight: "600" }}>No venue of such capacity</Text>
        </View>
      );
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 7, marginLeft: 5 }}>
        {filteredVenues.map(venue => (
          <TouchableOpacity
            key={venue.id}
            style={[styles.venueCard, (String(selectedVenue) === String(venue.id)) && styles.venueCardSelected]}
            onPress={() => { setSelectedVenue(venue.id); setAvailabilityError(""); }}
          >
            <Text style={styles.venueTitle}>{venue.title || venue.name}</Text>
            <Text style={styles.venueLocation}><Ionicons name="location-outline" size={15} /> {venue.location}</Text>
            <ImageSlider images={venue.previewImages || venue.images || []} />
            <Text style={styles.venueSubLabel}>Live Availability:</Text>
            <View style={styles.capacityPill}><Text style={styles.capacityPillText}>Capacity: {venue.capacity}</Text></View>

            <TouchableOpacity style={styles.viewToolsBtn} onPress={() => handleViewTools(venue)}>
              <Ionicons name="construct-outline" size={14} color="#0077B6" />
              <Text style={styles.viewToolsText}>View Resources Avaliable</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderVenueList = () => {
    if (!Array.isArray(filteredVenues) || filteredVenues.length === 0) {
      return (
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#be1922", fontSize: 16, fontWeight: "600" }}>No venue of such capacity</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={filteredVenues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.venueListCard, (String(selectedVenue) === String(item.id)) && styles.venueCardSelected]}
            onPress={() => { setSelectedVenue(item.id); setAvailabilityError(""); }}
          >
            <Image source={{ uri: item.image || item.previewImages?.[0] }} style={styles.venueListImage} />
            <View style={styles.venueListInfo}>
              <Text style={styles.venueTitle}>{item.title}</Text>
              <Text style={styles.venueLocation}><Ionicons name="location-outline" size={14} /> {item.location}</Text>
              <Text style={styles.venueSubLabel}>Capacity: {item.capacity}</Text>

              <TouchableOpacity style={styles.viewToolsBtnList} onPress={() => handleViewTools(item)}>
                <Ionicons name="construct-outline" size={14} color="#0077B6" />
                <Text style={styles.viewToolsText}>View Tools</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  /* --------------------------
     UI Return
     -------------------------- */
  return (
    <ScrollView style={{ backgroundColor: "#fafafc" }} contentContainerStyle={{ paddingBottom: 30 }}>

      {/* Event Details */}
      <View style={styles.detailsBlock}>
        <Text style={styles.sectionTitle}>Event Details</Text>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Event Name</Text>
          <TextInput style={styles.input} value={eventName} onChangeText={setEventName} placeholder="Enter event name" />
        </View>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Purpose of the event</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Enter purpose of the event"
            multiline={true}
            numberOfLines={5}
          />
        </View>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Campus</Text>
          <TouchableOpacity style={styles.pickerInput} onPress={() => setShowCampusPicker(true)}>
            <Ionicons name="location-outline" size={20} color="#0077B6" style={{ marginRight: 10 }} />
            <Text style={campus ? styles.pickerTextSet : styles.pickerTextPlaceholder}>{campus || "Select campus"}</Text>
          </TouchableOpacity>

          <Modal visible={showCampusPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Campus</Text>
                {["Emalahleni", "Polokwane", "Ga-Rankuwa", "Pretoria", "Soshanguve"].map(option => (
                  <TouchableOpacity key={option} style={styles.modalOption} onPress={() => { setCampus(option); setShowCampusPicker(false); }}>
                    <Text style={styles.modalOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowCampusPicker(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Capacity</Text>
          <View style={styles.capacityRow}>
            <TouchableOpacity style={styles.capBtn} onPress={decCapacity}>
              <Ionicons name="remove-circle-outline" size={24} color="#0077B6" />
            </TouchableOpacity>
            <TextInput style={[styles.input, { width: 60, textAlign: "center", marginRight: 4, marginLeft: 4 }]}
              value={capacity} onChangeText={v => setCapacity(v.replace(/[^0-9]/g, ""))} placeholder="0" keyboardType="numeric" />
            <TouchableOpacity style={styles.capBtn} onPress={incCapacity}>
              <Ionicons name="add-circle-outline" size={24} color="#0077B6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Venue Selection */}
      <Text style={styles.sectionTitle}>Venue Selection</Text>
      <View style={styles.switchBar}>
        <TouchableOpacity style={[styles.switchButton, viewType === "grid" && styles.switchSelected]} onPress={() => setViewType("grid")}>
          <Text style={[styles.switchButtonText, viewType === "grid" && styles.switchButtonTextSelected]}>Grid View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchButton, viewType === "list" && styles.switchSelected]} onPress={() => setViewType("list")}>
          <Text style={[styles.switchButtonText, viewType === "list" && styles.switchButtonTextSelected]}>List View</Text>
        </TouchableOpacity>
      </View>
      {viewType === "grid" ? renderVenueGrid() : renderVenueList()}

      {/* Date & Time */}
      <View style={styles.detailsBlock}>
        <Text style={styles.sectionTitle}>Date & Time</Text>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerInput} onPress={() => setShowCalendar(true)}>
            <Ionicons name="calendar-outline" size={20} color="#0077B6" style={{ marginRight: 10 }} />
            <Text style={date ? styles.pickerTextSet : styles.pickerTextPlaceholder}>{date ? date : "Select date"}</Text>
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarModal}>
              {selectedVenue ? (
                <Calendar
                  markedDates={mergedMarkedDates}
                  minDate={currentDate}
                  onDayPress={handleDayPress}
                />
              ) : (
                <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                  Select a venue to view available dates.
                </Text>
              )}

              <TouchableOpacity style={styles.calendarClose} onPress={() => setShowCalendar(false)}>
                <Text style={styles.calendarCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.labelInputGroup}>
          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <TouchableOpacity style={styles.pickerInput} onPress={() => setShowStartTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color="#0077B6" style={{ marginRight: 10 }} />
                <Text style={startTime ? styles.pickerTextSet : styles.pickerTextPlaceholder}>{startTime ? startTime : "Select start time"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>End Time</Text>
              <TouchableOpacity style={styles.pickerInput} onPress={() => setShowEndTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color="#0077B6" style={{ marginRight: 10 }} />
                <Text style={endTime ? styles.pickerTextSet : styles.pickerTextPlaceholder}>{endTime ? endTime : "Select end time"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartTimePicker && (
            <DateTimePicker
              value={selectedStartTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartTimePicker(false);
                if (selectedDate) {
                  setSelectedStartTime(selectedDate);
                  const hours = selectedDate.getHours().toString().padStart(2, '0');
                  const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                  setStartTime(`${hours}:${minutes}`);
                }
              }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={selectedEndTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndTimePicker(false);
                if (selectedDate) {
                  setSelectedEndTime(selectedDate);
                  const hours = selectedDate.getHours().toString().padStart(2, '0');
                  const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                  setEndTime(`${hours}:${minutes}`);
                }
              }}
            />
          )}
        </View>
      </View>

      {/* --- RESOURCES REQUIRED (Dynamic Tools) --- */}
      <View style={styles.servicesBlock}>
        <Text style={styles.sectionTitle}>Resources Required</Text>
        {isLoadingTools ? (
          <ActivityIndicator size="small" color="#0077B6" style={{ marginVertical: 20 }} />
        ) : (
          Object.keys(toolResources).length > 0 ? (
            Object.entries(toolResources).map(([resName, resValue]) => (
              <View key={resName} style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>{resName}</Text>
                <View style={styles.capacityRow}>
                  <TouchableOpacity style={styles.capBtn} onPress={() => handleResourceChange(resName, resValue - 1)}>
                    <Ionicons name="remove-circle-outline" size={24} color="#0077B6" />
                  </TouchableOpacity>
                  <Text style={[styles.input, { width: 50, textAlign: "center", lineHeight: 40 }]}>
                    {resValue}
                  </Text>
                  <TouchableOpacity style={styles.capBtn} onPress={() => handleResourceChange(resName, resValue + 1)}>
                    <Ionicons name="add-circle-outline" size={24} color="#0077B6" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: 'center', color: '#999', marginVertical: 10 }}>No additional resources available.</Text>
          )
        )}
      </View>

      {/* --- SERVICES REQUIRED (Dynamic Services) --- */}
      <View style={styles.servicesBlock}>
        <Text style={styles.sectionTitle}>Services Required</Text>
        {Object.entries(serviceResources).map(([sName, sValue]) => (
          <View key={sName} style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>{sName}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={[styles.yesNoBtn, sValue && styles.yesNoBtnSelected]}
                onPress={() => handleResourceChange(sName, true)}
              >
                <Text style={[styles.yesNoText, sValue && styles.yesNoTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.yesNoBtn, !sValue && styles.yesNoBtnSelected]}
                onPress={() => handleResourceChange(sName, false)}
              >
                <Text style={[styles.yesNoText, !sValue && styles.yesNoTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Type of function */}
      <View style={styles.typeBlock}>
        <Text style={styles.sectionTitle}>Type of function</Text>
        <View style={styles.checkboxContainer}>
          {eventTypes.map(type => (
            <TouchableOpacity key={type} style={styles.checkboxRow} onPress={() => setSelectedEventTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type])}>
              <MaterialIcons name={selectedEventTypes.includes(type) ? "check-box" : "check-box-outline-blank"} size={21} color="#0077B6" />
              <Text style={styles.checkLabel}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Type of Guest */}
      <View style={styles.typeBlock}>
        <Text style={styles.sectionTitle}>Type of Guest</Text>
        <View style={styles.checkboxContainer}>
          {guestTypes.map(type => (
            <TouchableOpacity key={type} style={styles.checkboxRow} onPress={() => setSelectedGuestTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type])}>
              <MaterialIcons name={selectedGuestTypes.includes(type) ? "check-box" : "check-box-outline-blank"} size={21} color="#0077B6" />
              <Text style={styles.checkLabel}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Branding & Mock-up */}
      <View style={styles.mockupBlock}>
        <Text style={styles.sectionTitle}>Branding & Mock-up</Text>
        <TouchableOpacity onPress={() => pickDocument(setUploadedBanner)} style={styles.uploadArea}>
          <Ionicons name="cloud-upload-outline" size={32} color="#666" style={{ marginBottom: 6 }} />
          <Text style={styles.uploadText}>Upload Image</Text>
        </TouchableOpacity>
        {uploadedBanner && <Image source={{ uri: uploadedBanner.uri }} style={styles.bannerPreview} />}
        <Text style={styles.mockPreviewLabel}>Banner Mock-up Preview:</Text>
        <View style={styles.bannerBlock}>
          {uploadedBanner ? <Image source={{ uri: uploadedBanner.uri }} style={styles.bannerImageInPreview} /> : <View style={styles.bannerImageInPreviewGrey} />}
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.termsBlock}>
        <Text style={styles.sectionTitle}>Terms and Conditions</Text>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setShowTermsModal(true)}>
          <MaterialIcons name={termsAccepted ? "check-box" : "check-box-outline-blank"} size={21} color="#0077B6" />
          <Text style={styles.checkLabel}>I have read and accept the terms and conditions</Text>
        </TouchableOpacity>
        {!termsAccepted && <Text style={styles.termsError}>You must accept the terms and conditions to proceed with your booking.</Text>}
        <Modal visible={showTermsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <ScrollView style={styles.termsScroll}>
                {termsText.split('\n').map((line, index) => <Text key={index} style={styles.termsLine}>{line}</Text>)}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnAccept} onPress={() => { setTermsAccepted(true); setShowTermsModal(false); }}>
                  <Text style={styles.btnAcceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDecline} onPress={() => { setTermsAccepted(false); setShowTermsModal(false); }}>
                  <Text style={styles.btnDeclineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.saveButton, (!canSubmit || submitting) && styles.saveButtonDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
      >
        <Text style={styles.saveButtonText}>{submitting ? "Submitting..." : isEdit ? "Update Event" : "Submit"}</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />

      {/* Tools Modal */}
      <Modal visible={showToolsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tools in {currentVenueName}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {currentVenueTools.length > 0 ? (
                currentVenueTools.map((tool, index) => (
                  <View key={index} style={styles.toolItemRow}>
                    <Ionicons name="construct-outline" size={18} color="#555" />
                    <Text style={styles.toolItemText}>{tool.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noToolsText}>No tools listed for this venue.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowToolsModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

/* --------------------------
   Styles
   -------------------------- */
const styles = StyleSheet.create({
  container: { backgroundColor: "#fafafc" },
  sectionTitle: {
    fontSize: 18, fontWeight: "700", marginHorizontal: 16, marginVertical: 10, color: "#191823"
  },
  labelInputGroup: { marginBottom: 14 },
  fieldLabel: { fontWeight: '700', color: "#0077B6", fontSize: 15, marginBottom: 4, marginLeft: 3 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 7, marginBottom: 0, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15 },
  resourceBlock: { backgroundColor: "#fff", borderRadius: 15, margin: 13, padding: 17, marginTop: 4 },
  resourceGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  resourceItem: { width: "30%", marginBottom: 14, alignItems: "center" },
  resourceIcon: { width: 60, height: 60, borderRadius: 8, marginBottom: 5 },
  resourceLabel: { color: "#222", fontWeight: "600", fontSize: 14, textAlign: "center" },
  capacityRow: { flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 0 },
  capBtn: { padding: 1, marginHorizontal: 2 },
  pickerInput: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 13, backgroundColor: "#f5f5f5", borderRadius: 7 },
  pickerTextPlaceholder: { color: "#999", fontSize: 15 },
  pickerTextSet: { color: "#0077B6", fontSize: 15, fontWeight: "700" },
  switchBar: { flexDirection: "row", marginHorizontal: 8, marginVertical: 8, justifyContent: "flex-start", gap: 10 },
  switchButton: { flex: 1, backgroundColor: "#e9e9ee", borderRadius: 8, paddingVertical: 7, justifyContent: "center", alignItems: "center" },
  switchSelected: { backgroundColor: '#0077B6' },
  switchButtonText: { color: '#57516b', fontWeight: "700", fontSize: 15 },
  switchButtonTextSelected: { color: "#fff" },
  venueCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginRight: 13, minWidth: 240, maxWidth: 252, elevation: 2, borderWidth: 1, borderColor: '#ececec' },
  venueCardSelected: { borderWidth: 2, borderColor: '#0077B6' },
  venueTitle: { fontSize: 16, fontWeight: '700', color: '#0077B6' },
  venueLocation: { fontSize: 13, color: '#767676', marginVertical: 2 },
  venuePrice: { fontSize: 14, color: '#000', fontWeight: 'bold', marginVertical: 2 },
  venueSubLabel: { fontSize: 13, color: "#888", marginTop: 4 },
  capacityPill: { alignSelf: 'flex-start', backgroundColor: '#0077B6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, marginTop: 4 },
  capacityPillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  typeBlock: { backgroundColor: "#fff", marginTop: 12, marginHorizontal: 8, borderRadius: 15, padding: 17 },
  checkboxContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginRight: 18, marginBottom: 8 },
  checkLabel: { marginLeft: 4, fontSize: 15, color: "#0077B6", fontWeight: "500" },
  mockupBlock: { backgroundColor: "#fff", margin: 13, borderRadius: 15, padding: 16, marginBottom: 12 },
  uploadArea: { alignSelf: "center", alignItems: "center", paddingVertical: 12, marginBottom: 10 },
  uploadText: { color: "#0077B6", fontWeight: "500", fontSize: 15, marginTop: 3 },
  mockPreviewLabel: { marginTop: 12, marginLeft: 6, fontSize: 14, color: '#222' },
  bannerBlock: { marginTop: 7, alignItems: "center", width: '100%' },
  bannerPreview: { alignSelf: "center", width: 175, height: 70, borderRadius: 8, marginBottom: 6 },
  bannerImageInPreview: { width: "94%", height: 41, borderRadius: 7 },
  bannerImageInPreviewGrey: { width: "94%", height: 41, borderRadius: 7, backgroundColor: '#ececec' },
  detailsBlock: { backgroundColor: "#fff", marginHorizontal: 8, borderRadius: 15, padding: 16, marginVertical: 5, paddingTop: 30 },
  calendarBlock: { backgroundColor: "#fff", marginTop: 12, marginHorizontal: 8, borderRadius: 13, padding: 15, marginBottom: 10 },
  saveButton: { backgroundColor: "#0077B6", borderRadius: 15, marginHorizontal: 14, marginTop: 12, paddingVertical: 17, alignItems: "center" },
  saveButtonDisabled: { backgroundColor: "#ccc" },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '80%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, textAlign: 'center', color: '#191823' },
  modalOption: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#ececec' },
  modalOptionText: { fontSize: 16, color: '#252438' },
  modalClose: { marginTop: 15, paddingVertical: 10, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: '#0077B6', fontWeight: '600' },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeColumn: { flex: 1, marginHorizontal: 5 },
  timeLabel: { fontSize: 14, color: "#0077B6", fontWeight: "600", marginBottom: 4 },
  termsBlock: { backgroundColor: "#fff", margin: 13, borderRadius: 15, padding: 16, marginBottom: 12 },
  termsError: { color: '#be1922', fontSize: 14, marginTop: 8, textAlign: 'center' },
  termsScroll: { maxHeight: 200 },
  termsLine: { fontSize: 14, color: '#252438', marginBottom: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  btnAccept: { backgroundColor: '#0077B6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnAcceptText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDecline: { backgroundColor: '#be1922', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnDeclineText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  servicesBlock: { backgroundColor: "#fff", marginTop: 12, marginHorizontal: 8, borderRadius: 15, padding: 17 },
  serviceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  serviceLabel: { fontSize: 15, color: "#0077B6", fontWeight: "600" },
  yesNoBtn: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: "#f5f5f5" },
  yesNoBtnSelected: { backgroundColor: "#0077B6", borderColor: "#0077B6" },
  yesNoText: { color: "#555", fontWeight: "600", fontSize: 14 },
  yesNoTextSelected: { color: "#fff" },
  venueListCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginHorizontal: 13, marginBottom: 10, borderWidth: 1, borderColor: '#ececec', elevation: 1, alignItems: 'center' },
  venueListImage: { width: 90, height: 70, borderRadius: 8, marginRight: 12, backgroundColor: '#e0e0e0' },
  venueListInfo: { flex: 1 },
  sliderContainer: { position: 'relative', width: '100%', height: 95, borderRadius: 10, marginVertical: 6, overflow: 'hidden', backgroundColor: '#e0e0e0' },
  sliderImage: { width: '100%', height: '100%', borderRadius: 10 },
  arrowButton: { position: 'absolute', top: '50%', transform: [{ translateY: -12 }], backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 20, padding: 4, zIndex: 1 },
  leftArrow: { left: 8 }, rightArrow: { right: 8 },
  calendarModal: { backgroundColor: '#fff', borderRadius: 10, padding: 20, marginTop: 10 },
  calendarClose: { marginTop: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#0077B6', borderRadius: 8 },
  calendarCloseText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  viewToolsBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0077B6',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewToolsBtnList: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#0077B6',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  viewToolsText: {
    fontSize: 12,
    color: '#0077B6',
    fontWeight: '600',
    marginLeft: 4,
  },
  toolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolItemText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  noToolsText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 15,
    fontStyle: 'italic',
  },
});