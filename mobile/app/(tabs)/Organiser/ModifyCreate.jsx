import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { updateEventAPI } from "../../data/Organiser/myEvents";

// 1. IMPORTING ONLY ONE IMAGE
const singleImage = require('@/assets/images/one.jpg');

const { width } = Dimensions.get('window');

// --- TUT BRAND COLORS ---
const COLORS = {
  NAVY: '#002855',
  RED: '#E31837',
  GOLD: '#FFB81C',
  WHITE: '#FFFFFF',
  BG_GREY: '#F5F7FA',
  TEXT_DARK: '#333333',
  INPUT_BG: '#FFFFFF',
  BORDER_LIGHT: '#E5E5EA'
};

export default function ModifyCard() {
  const navigation = useNavigation();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ANIMATION SETUP ---
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startRotation = () => {
      rotateValue.setValue(0);
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };
    startRotation();
  }, []);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // INPUT STATES
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [status, setStatus] = useState("");
  const [expectedAttend, setExpectedAttend] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [ticketRequired, setTicketRequired] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [allowAttendeePurchase, setAllowAttendeePurchase] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState({});

  useEffect(() => {
    if (eventData) {
      setName(eventData.name || "");
      setDescription(eventData.description || "");
      setStartDateTime(eventData.startDateTime || "");
      setEndDateTime(eventData.endDateTime || "");
      setStatus(eventData.status || "");
      setExpectedAttend(eventData.expectedAttend ? String(eventData.expectedAttend) : "");
      setTotalTickets(eventData.totalTickets ? String(eventData.totalTickets) : "");
      setIsFree(eventData.isFree || false);
      setTicketRequired(eventData.ticketRequired || false);
      setAutoDistribute(eventData.autoDistribute || false);
      setAllowAttendeePurchase(eventData.allowAttendeePurchase || false);
      setTicketQuantities(
        (eventData.ticketDefinitions || []).reduce((acc, t) => {
          acc[t.id] = t.quantity !== null ? String(t.quantity) : "";
          return acc;
        }, {})
      );
    }
  }, [eventData]);

  useEffect(() => {
    const load = async () => {
      try {
        const selectedEvent = await AsyncStorage.getItem('selectedEvent');
        if (selectedEvent) {
          setEventData(JSON.parse(selectedEvent));
        } else {
          navigation.navigate("Events");
        }
      } catch (error) {
        navigation.navigate("Events");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigation]);

  const validateInputs = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Event name is required.");
      return false;
    }
    return true;
  };

  const handleModify = async () => {
    if (!validateInputs()) return;

    const updatedFields = {};

    if (name !== eventData.name) updatedFields.name = name;
    if (description !== eventData.description) updatedFields.description = description;
    if (startDateTime !== eventData.startDateTime) updatedFields.startDateTime = startDateTime;
    if (endDateTime !== eventData.endDateTime) updatedFields.endDateTime = endDateTime;

    // ❌ REMOVE IMAGE – your backend does not accept it
    // updatedFields.image = "one.jpg";

    updatedFields.isFree = isFree;
    updatedFields.ticketRequired = ticketRequired;

    try {
      await updateEventAPI(eventData.id, updatedFields);
      Alert.alert("Success", "Event updated successfully!");
      navigation.navigate("Events");
    } catch (error) {
      Alert.alert("Error", "Failed to update event.");
    }
  };


  const handleCancel = () => navigation.navigate("Events");

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.NAVY} />
      </View>
    );

  if (!eventData)
    return (
      <View style={styles.center}>
        <Text>No Data</Text>
      </View>
    );

  return (
    <View style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.cardContainer}>

          <Animated.View style={[styles.rotatingBackground, { transform: [{ rotate }] }]}>
            <LinearGradient
              colors={[COLORS.NAVY, COLORS.GOLD, COLORS.RED, COLORS.NAVY]}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <View style={styles.innerCard}>
            <Text style={styles.sectionTitle}>Modify Event Details</Text>
            <Text style={styles.subTitle}>Update your event information below</Text>

            <View style={styles.imageContainer}>
              <Image source={singleImage} style={styles.headerImage} />
            </View>

            <TextInputField label="Event Name" value={name} onChangeText={setName} />
            <TextInputField label="Description" value={description} onChangeText={setDescription} multiline />
            <SwitchRow label="Ticket Required?" value={ticketRequired} onValueChange={setTicketRequired} />

            <View style={styles.buttonRow}>

              {/* CANCEL BUTTON */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed
                ]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              {/* SAVE BUTTON */}
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed
                ]}
                onPress={handleModify}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>

            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const TextInputField = ({ label, value, onChangeText, multiline }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 90, paddingTop: 12 }]}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#AAA"
      multiline={multiline}
    />
  </View>
);

const SwitchRow = ({ label, value, onValueChange }) => (
  <View style={styles.switchRow}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#E5E5EA", true: COLORS.NAVY }}
      thumbColor={value ? COLORS.GOLD : "#FFF"}
    />
  </View>
);

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.BG_GREY },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingVertical: 40, paddingHorizontal: 15, alignItems: 'center' },

  cardContainer: {
    width: '100%',
    borderRadius: 24,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },

  rotatingBackground: {
    position: 'absolute',
    width: 1000,
    height: 1000,
    top: -200,
    left: -200
  },

  innerCard: {
    width: '100%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 25,
    zIndex: 1
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    color: COLORS.NAVY
  },

  subTitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20
  },

  imageContainer: { marginBottom: 20 },
  headerImage: { width: '100%', height: 160, borderRadius: 16 },

  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.NAVY, marginBottom: 6, fontWeight: '700' },

  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    backgroundColor: COLORS.WHITE,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15
  },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, color: COLORS.TEXT_DARK },

  buttonRow: { flexDirection: 'row', gap: 20, marginTop: 25 },

  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.RED,
    backgroundColor: COLORS.WHITE,
    alignItems: 'center'
  },
  cancelButtonPressed: { backgroundColor: COLORS.RED },
  cancelButtonText: { color: COLORS.RED, fontWeight: '700' },

  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: COLORS.NAVY,
    borderWidth: 1.5,
    borderColor: COLORS.NAVY,
    alignItems: 'center',
  },
  saveButtonPressed: { backgroundColor: COLORS.GOLD },
  saveButtonText: { color: COLORS.WHITE, fontWeight: '700' },
});
