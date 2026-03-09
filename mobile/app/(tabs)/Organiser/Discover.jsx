import { Pressable, Text, View, ScrollView, FlatList, Modal } from "react-native";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from "react-native";
import EvilIcons from '@expo/vector-icons/EvilIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const eventsData = {
  events: [
    {
      id: 1,
      title: "Annual Tech Summit",
      date: "Saturday, 19 October at 09:00 AM",
      location: "Innovation Hub, Building 4",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80 ",
      tags: ["Leadership", "Networking", "Enterprise"],
      category: "Academic"
    },
    {
      id: 2,
      title: "Spring Arts Festival",
      date: "Sunday, 27 October at 14:00 PM",
      location: "Central Park Amphitheater",
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80 ",
      tags: ["Music", "Art", "Culture"],
      category: "Arts & Culture"
    },
    {
      id: 3,
      title: "Career Development Workshop",
      date: "Friday, 25 October at 18:30 PM",
      location: "TechHub Co-working Space",
      image: "https://images.unsplash.com/photo-1559223607-ca4c3a29500d?w=800&q=80 ",
      tags: ["Entrepreneurship", "Networking", "Innovation"],
      category: "Academic"
    },
    {
      id: 4,
      title: "Jazz Under The Stars",
      date: "Saturday, 02 November at 19:00 PM",
      location: "Riverside Gardens",
      image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80 ",
      tags: ["Music", "Entertainment", "Outdoor"],
      category: "Arts & Culture"
    },
    {
      id: 5,
      title: "AI & Machine Learning Workshop",
      date: "Wednesday, 30 October at 10:00 AM",
      location: "Digital Innovation Center, Room 301",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80 ",
      tags: ["Technology", "Workshop", "AI"],
      category: "Academic"
    }
  ]
};

export default function HomeAttendee() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Events');
  const [filteredEvents, setFilteredEvents] = useState(eventsData.events);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // State for Share Modal
  const [shareVisible, setShareVisible] = useState(false);
  const [shareEvent, setShareEvent] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <View style={style.headerContainer}>
          <View style={style.row}>
            <Text style={style.title}>Discover Events</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(!isNotificationOpen)}>
              <Ionicons name="notifications-outline" size={26} color="black" />
            </TouchableOpacity>
          </View>
          <View style={style.searchBar}>
            <EvilIcons name="search" size={24} color="black" />
            <TextInput
              style={style.input}
              placeholder="Search events..."
              placeholderTextColor={"#999"}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      ),
    });
  }, [search]);

  useEffect(() => {
    let filtered = eventsData.events;
    if (selectedCategory !== 'All Events') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }
    if (search.trim()) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase()) ||
        event.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setFilteredEvents(filtered);
  }, [search, selectedCategory]);

  const categories = [
    { id: 'all', name: 'All Events', icon: 'apps-sharp' },
    { id: 'academic', name: 'Academic', icon: 'school-outline' },
    { id: 'arts', name: 'Arts & Culture', icon: 'musical-notes-outline' },
    { id: 'sport', name: 'Sport', icon: 'football-outline' },
    { id: 'cultural', name: 'Cultural', icon: 'color-palette-outline' },
    { id: 'tech', name: 'Technology', icon: 'laptop-outline' },
    { id: 'community', name: 'Community', icon: 'people-outline' }
  ];

  const notifications = [
    { id: '1', title: 'Event Approved', message: 'Your event "Career Day" has been approved.', time: '2 min ago' },
    { id: '2', title: 'New RSVP', message: 'John Doe registered for your event.', time: '1 hour ago' },
    { id: '3', title: 'Resource Request', message: 'Pending approval for projector booking.', time: '3 hours ago' },
    { id: '4', title: 'Resource Request', message: 'Pending approval for projector booking.', time: '3 hours ago' },
    { id: '5', title: 'Resource Request', message: 'Pending approval for projector booking.', time: '3 hours ago' }
  ];

  // Modal share options
  const renderShareModal = () => (
    <Modal
      visible={shareVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setShareVisible(false)}
    >
      <View style={style.shareModalBackdrop}>
        <View style={style.shareModal}>
          <Text style={style.shareModalTitle}>Share Event</Text>
          <Text style={style.shareEventName}>{shareEvent?.title}</Text>
          <View style={style.shareOptionsRow}>
            <TouchableOpacity style={style.shareIconBtn}>
              <FontAwesome name="facebook-square" size={36} color="#4267B2" />
              <Text style={style.shareOptionText}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={style.shareIconBtn}>
              <Ionicons name="logo-instagram" size={36} color="#e1306c" />
              <Text style={style.shareOptionText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={style.shareIconBtn}>
              <Ionicons name="logo-twitter" size={36} color="#1da1f2" />
              <Text style={style.shareOptionText}>X</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={style.shareModalClose} onPress={() => setShareVisible(false)}>
            <Text style={style.shareModalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEventCard = ({ item }) => (
    <TouchableOpacity style={style.eventCard} activeOpacity={1}>
      <Image source={{ uri: item.image }} style={style.eventImage} />
      <View style={style.eventContent}>
        <Text style={style.eventTitle}>{item.title}</Text>
        <View style={style.eventMeta}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={style.eventText}>{item.date}</Text>
        </View>
        <View style={style.eventMeta}>
          <Ionicons name="location-outline" size={16} color="#888" />
          <Text style={style.eventText}>{item.location}</Text>
        </View>
        <View style={style.tagsContainer}>
          {item.tags.map((tag, i) => (
            <View key={i} style={style.tag}>
              <Text style={style.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={style.shareButton}
          onPress={() => {
            setShareEvent(item);
            setShareVisible(true);
          }}>
          <Ionicons name="share-social-outline" size={18} color="#00B050" />
          <Text style={style.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={style.container}>
      {/* Social Media Share Modal */}
      {renderShareModal()}
      {/* Category Filter Bar, always visible */}
      {isNotificationOpen && (
        <View style={style.notificationDropdown}>
          <View style={style.notificationHeader}>
            <Text style={style.notificationTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)}>
              <AntDesign name="close" size={16} color="#999" />
            </TouchableOpacity>
          </View>
          {notifications.length === 0 ? (
            <Text style={style.emptyText2}>No new notifications</Text>
          ) : (
            <ScrollView style={style.notificationList}>
              {notifications.map((item) => (
                <View key={item.id} style={style.notificationItem}>
                  <View style={style.notificationIcon}>
                    <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
                  </View>
                  <View style={style.notificationContent}>
                    <Text style={style.notificationItemTitle}>{item.title}</Text>
                    <Text style={style.notificationItemMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={style.notificationTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
      <View style={style.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={style.categoriesContent}
          onTouchStart={() => isNotificationOpen && setIsNotificationOpen(false)}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                style.categoryButton,
                selectedCategory === category.name && style.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Ionicons
                name={category.icon}
                size={17}
                color={selectedCategory === category.name ? '#fff' : '#444'}
              />
              <Text style={[
                style.categoryText,
                selectedCategory === category.name && style.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={style.eventsList}
        showsVerticalScrollIndicator={false}
        onTouchStart={() => isNotificationOpen && setIsNotificationOpen(false)}
      />
      {filteredEvents.length === 0 && (
        <View style={style.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={style.emptyText}>No events found</Text>
          <Text style={style.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      )}
    </View>
  );
}

const style = StyleSheet.create({
   notificationDropdown: {
  position: 'absolute',
  top: -90, // Adjust based on your header height (~status bar + header)
  right: 9,
  width: 300,
  maxHeight: 300,
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#eee',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 5,
  zIndex: 1000,
  padding: 12,
},
notificationHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
notificationTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
},
emptyText2: {
  color: '#999',
  textAlign: 'center',
  fontStyle: 'italic',
  paddingVertical: 20,
},
notificationItem: {
  flexDirection: 'row',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
notificationIcon: {
  marginRight: 12,
  marginTop: 4,
},
notificationContent: {
  flex: 1,
},
notificationItemTitle: {
  fontWeight: '600',
  fontSize: 14,
  color: '#333',
},
notificationItemMessage: {
  fontSize: 13,
  color: '#666',
  marginVertical: 4,
},
notificationTime: {
  fontSize: 11,
  color: '#999',
},
   row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    
    marginBottom: 20,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',          // icon + text side by side
    alignItems: 'center',          // vertically align
    backgroundColor: '#f2f2f2',    // light background
    borderRadius: 20,              // rounded look
    paddingHorizontal: 12,
    margin: 5,
    height: 45,
  },
  headerContainer: {
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',

  },
  title: {
    fontSize: 19,
    fontWeight: "600",
    color: "#181818",
    textAlign: "center",
    marginBottom: 8, 
    marginTop: 0,
  },
  input: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    outlineStyle: 'none',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  categoriesContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
    paddingVertical: 5,
    paddingTop: 2,
    paddingBottom: 0,
    zIndex: 2
  },
  categoriesContent: {
    paddingHorizontal: 17,
    paddingVertical: 6,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 17,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 10
  },
  categoryButtonActive: {
    backgroundColor: "#0077B6",
    borderWidth: 1,
    borderColor: "#0077B6"
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 15,
    color: "#191823",
    fontWeight: "600"
  },
  categoryTextActive: {
    color: "#fff"
  },
  eventsList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 18
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden"
  },
  eventImage: {
    width: "100%",
    height: 175,
    resizeMode: "cover",
    marginBottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eventContent: {
    padding: 16,
    paddingBottom: 8,
  },
  eventTitle: {
    fontSize: 17.5,
    fontWeight: "700",
    marginBottom: 10,
    color: "#191823",
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    marginTop: 2,
  },
  eventText: {
    marginLeft: 8,
    fontSize: 14.5,
    color: "#6a6a6a",
    flex: 1,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 7,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9c9c9c",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#F3FBEF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
    marginTop: 8,
  },
  shareText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#00B050",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 36
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  // --- Add this to the end of your styles:
  shareModalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.18)", justifyContent: "flex-end"
  },
  shareModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 23, borderTopRightRadius: 23,
    padding: 25, alignItems: "center"
  },
  shareModalTitle: {
    fontWeight: "700", fontSize: 19, marginBottom: 8, color: "#0077B6"
  },
  shareEventName: {
    fontWeight: "600", color: "#0077B6", marginBottom: 15, textAlign: "center"
  },
  shareOptionsRow: {
    flexDirection: "row", justifyContent: "space-around", marginBottom: 12, width: "100%"
  },
  shareIconBtn: {
    alignItems: "center", marginHorizontal: 12
  },
  shareOptionText: {
    fontSize: 12.5, marginTop: 6, color: "#34313f", fontWeight: "600"
  },
  shareModalClose: {
    alignSelf: "stretch", borderRadius: 7, backgroundColor: "#f2f2f2",
    marginTop: 7, padding: 12, alignItems: "center"
  },
  shareModalCloseText: {
    fontWeight: "700", color: "#0077B6", fontSize: 15
  }
});