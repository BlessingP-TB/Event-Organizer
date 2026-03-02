import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvents } from '../../hooks/Attendee/useEvents';

export default function RatingsPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { department, adminName, eventId } = route.params || {};
  const { updateEventStatus } = useEvents();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const checkIfAlreadyRated = async () => {
      if (eventId) {
        try {
          const existingRatings = await AsyncStorage.getItem('eventRatings');
          const ratings = existingRatings ? JSON.parse(existingRatings) : {};
          if (ratings[eventId]) {
            setHasRated(true);
            Alert.alert(
              'Already Rated',
              'You have already rated this event.',
              [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]
            );
          }
        } catch (error) {
          console.error('Error checking rating:', error);
        }
      }
    };

    checkIfAlreadyRated();
  }, [eventId, navigation]);

  const ratingCategories = [
    { id: 'response_time', label: 'Response Time', icon: 'time-outline' },
    { id: 'helpfulness', label: 'Helpfulness', icon: 'thumbs-up-outline' },
    { id: 'professionalism', label: 'Professionalism', icon: 'business-outline' },
    { id: 'knowledge', label: 'Knowledge', icon: 'school-outline' },
    { id: 'communication', label: 'Communication', icon: 'chatbubble-outline' },
  ];

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategoryIcon = (categoryId) => {
    const icons = {
      response_time: 'time',
      helpfulness: 'thumbs-up',
      professionalism: 'business',
      knowledge: 'school',
      communication: 'chatbubble',
    };
    return icons[categoryId] || 'star';
  };

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Categories Required', 'Please select at least one rating category.');
      return;
    }

    const ratingData = {
      rating,
      comments,
      categories: selectedCategories,
      department,
      adminName,
      timestamp: new Date(),
    };

    console.log('Rating submitted:', ratingData);

    // Store rating in AsyncStorage to prevent re-rating
    if (eventId) {
      try {
        const existingRatings = await AsyncStorage.getItem('eventRatings');
        const ratings = existingRatings ? JSON.parse(existingRatings) : {};
        ratings[eventId] = ratingData;
        await AsyncStorage.setItem('eventRatings', JSON.stringify(ratings));
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }

    Alert.alert(
      'Thank You!',
      'Your rating has been submitted successfully.',
      [
        {
          text: 'OK', onPress: () => {
            // Clear the form
            setRating(0);
            setComments('');
            setSelectedCategories([]);
            navigation.goBack();
          }
        },
      ]
    );
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          onPressIn={() => setHoverRating(star)}
          onPressOut={() => setHoverRating(0)}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= (hoverRating || rating) ? 'star' : 'star-outline'}
            size={40}
            color="#0077B6"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const getRatingText = () => {
    const texts = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return texts[rating] || 'Select Rating';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0077B6" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Rate Your Experience</Text>

        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <Text style={styles.sectionDescription}>
            How would you rate your experience with {adminName || 'the administrator'}?
          </Text>

          {renderStars()}

          <View style={styles.ratingTextContainer}>
            <Text style={[styles.ratingText, { color: '#0077B6' }]}>
              {getRatingText()}
            </Text>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What was great?</Text>
          <Text style={styles.sectionDescription}>
            Select categories that stood out (select all that apply)
          </Text>

          <View style={styles.categoriesContainer}>
            {ratingCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategories.includes(category.id) && styles.categoryButtonSelected
                ]}
                onPress={() => toggleCategory(category.id)}
              >
                <Ionicons
                  name={getCategoryIcon(category.id)}
                  size={20}
                  color="#0077B6"
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategories.includes(category.id) && styles.categoryTextSelected
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Comments</Text>
          <Text style={styles.sectionDescription}>
            Share more details about your experience (optional)
          </Text>

          <View style={styles.commentsContainer}>
            <TextInput
              style={styles.commentsInput}
              value={comments}
              onChangeText={setComments}
              placeholder="Tell us more about your experience..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {comments.length}/500
            </Text>
          </View>
        </View>

        {/* Department Info */}
        {department && (
          <View style={styles.departmentSection}>
            <Ionicons name="business-outline" size={16} color="#0077B6" />
            <Text style={styles.departmentText}>
              Department: {department}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || selectedCategories.length === 0) && styles.submitButtonDisabled]}
          onPress={submitRating}
          disabled={rating === 0 || selectedCategories.length === 0}
        >
          <Text style={styles.submitButtonText}>Submit Rating</Text>
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { padding: 5 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  content: { flex: 1 },
  section: { backgroundColor: 'white', marginHorizontal: 15, marginTop: 15, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  starButton: { padding: 5, marginHorizontal: 5 },
  ratingTextContainer: { alignItems: 'center', marginTop: 10 },
  ratingText: { fontSize: 16, fontWeight: 'bold' },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 10, width: '48%' },
  categoryButtonSelected: { backgroundColor: '#f0e6f5', borderColor: '#0077B6' },
  categoryText: { fontSize: 14, color: '#666', marginLeft: 8, fontWeight: '500' },
  categoryTextSelected: { color: '#0077B6', fontWeight: 'bold' },
  commentsContainer: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, backgroundColor: '#f8f9fa' },
  commentsInput: { padding: 15, fontSize: 15, color: '#333', minHeight: 120 },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', paddingHorizontal: 15, paddingBottom: 10 },
  departmentSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', marginHorizontal: 15, marginTop: 10, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  departmentText: { fontSize: 14, color: '#666', marginLeft: 8 },
  footer: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0077B6', paddingVertical: 15, borderRadius: 12 },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
});
