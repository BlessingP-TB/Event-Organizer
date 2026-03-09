// app/eventDetails.jsx
import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../../../hooks/Attendee/useEvents';
import { use, useEffect, useState } from "react";
import { useRouter } from "expo-router";

export default function EventDetails() {
  
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const { getEventById } = useEvents();
  const event = getEventById(id);
  const router = useRouter();

   useEffect(() => {
      navigation.setOptions({ headerShown: false });
    }, []);

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 18 }}>
          Event not found
        </Text>
      </SafeAreaView>
    );
  }

  
  const button = event.status === "Upcoming" ? "Your Ticket" : event.status === "Attended" ? " Rate Event" : "Missed Event";
  const navButton = button === "Your Ticket" ? "../QrCode" : button === " Rate Event" ? "../RateEventPage" : "../Events";

  const handleRegister = () => {
     router.push("../RegisterEvent");
  };

  const handleShare = async () => {
    // Basic share functionality
    alert(`Share ${event.title} with friends!`);
  };

  const handleContact = () => {
    Linking.openURL(`mailto:${event.contact}`);
  };

  const handleLocation = () => {
    // This would typically open maps with the location
    alert(`Opening location: ${event.location}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container2}>
        {/* Header Image */}
        <Image 
          source={{ uri: event.image }} 
          style={styles.eventImage}
        />

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Event Content */}
        <View style={styles.content}>
          {/* Title and Category */}
          <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          </View>

          {/* Event Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{event.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{event.duration}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>{event.capacity}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>Organized by: {event.organizer}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={20} color="#0077B6" />
              <Text style={styles.detailText}>Price: {event.price}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {event.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <TouchableOpacity style={styles.contactRow} onPress={handleContact}>
              <Ionicons name="mail-outline" size={20} color="#0077B6" />
              <Text style={styles.contactText}>{event.contact}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        
        
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push(navButton)}>
          <Text style={styles.primaryButtonText}>{button}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container2: {
    marginTop: -50,
    
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  eventImage: {
    width: '100%',
    height: 250,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#191823',
    flex: 1,
    marginRight: 10,
  },
  categoryBadge: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0077B6',
  },
  detailsSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#191823',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#0077B6',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#0077B6',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    paddingBottom: -50,
    marginBottom: -20
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#0077B6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    
  },
  secondaryButtonText: {
    color: '#0077B6',
    fontSize: 16,
    fontWeight: '600',
  },
});