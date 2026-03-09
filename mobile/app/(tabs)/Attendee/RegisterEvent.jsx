import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function EventRegistration() {
  const navigation = useNavigation();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    studentNumber: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeUpdates, setSubscribeUpdates] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }
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
      await new Promise(resolve => setTimeout(resolve, 1500));
      const registrationData = {
        ...formData,
        subscribeUpdates,
        registeredAt: new Date(),
      };
      console.log('Registration data:', registrationData);

      Alert.alert(
        'Registration Successful!',
        `Thank you ${formData.fullName}! You have successfully secured your spot. ${subscribeUpdates ? 'You will receive event updates.' : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Registration Failed', 'There was an error processing your registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0077B6" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Event Registration</Text>
          <Text style={styles.headerSubtitle}>Fill out the form to secure your spot</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Heading */}
        <View style={styles.section}>
          <View style={styles.headingContainer}>
            <Ionicons name="ticket-outline" size={32} color="#0077B6" />
            <Text style={styles.mainHeading}>Fill out the form to secure your spot</Text>
            <Text style={styles.subHeading}>
              Complete the registration form below to reserve your place at the event
            </Text>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionDescription}>
            Please provide your details to complete the registration
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
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

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setSubscribeUpdates(!subscribeUpdates)}
          >
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

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
          <Text style={styles.infoText}>
            You will receive a confirmation email with event details. Please bring your student ID to the event.
          </Text>
        </View>
      </ScrollView>

      {/* Register Button */}
      <View style={styles.footer}>
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
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingTop: 50 },
  backButton: { padding: 5 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  content: { flex: 1 },
  section: { backgroundColor: 'white', marginHorizontal: 15, marginTop: 15, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  headingContainer: { alignItems: 'center', paddingVertical: 10 },
  mainHeading: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginTop: 15, marginBottom: 10, lineHeight: 32 },
  subHeading: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#333', backgroundColor: '#f8f9fa' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  checkboxTextContainer: { flex: 1 },
  checkboxText: { fontSize: 14, color: '#333', lineHeight: 20 },
  linkText: { color: '#0077B6', fontWeight: '600' },
  infoSection: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#e3f2fd', marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  infoText: { fontSize: 14, color: '#1976d2', marginLeft: 10, flex: 1, lineHeight: 18 },
  footer: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  registerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0077B6', paddingVertical: 16, borderRadius: 12 },
  registerButtonDisabled: { backgroundColor: '#ccc' },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
});
