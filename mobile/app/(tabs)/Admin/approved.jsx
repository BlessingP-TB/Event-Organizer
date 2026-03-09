import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { getEvents } from "../../data/Organiser/myEvents"; // Import API functions

export default function ApprovedScreen() {
    const [eventsData, setEventsData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true); // New state for loading

    // 1. Fetch data on component mount
    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const events = await getEvents();
                setEventsData(events);
            } catch (error) {
                console.error("Failed to load approved events:", error);
                // Optionally show a user-friendly error message
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    // 2. Filter and Search Logic
    const approvedEvents = useMemo(() => {
        // Filter: Keep only items where myEvents.js mapped the status to "Approved"
        const byApproval = eventsData.filter((e) => e.approval === "Approved");

        if (!searchQuery.trim()) return byApproval;

        // Search: Filter by query
        const q = searchQuery.toLowerCase();
        return byApproval.filter(
            (e) =>
                e.title?.toLowerCase().includes(q) ||
                e.type?.toLowerCase().includes(q) ||
                e.id?.toLowerCase().includes(q)
        );
    }, [eventsData, searchQuery]);

    const getThemeIcon = (type) => {
        // Placeholder for theme/type icon logic
        return "event"; // default
    }

    const renderEventCard = ({ item }) => (
        <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
                {/* Placeholder Avatar/Icon Circle */}
                <View style={styles.iconCircle}>
                    <MaterialIcons name={getThemeIcon(item.category)} size={26} color="#0077B6" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventId}>Request ID: {item.id}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Ionicons name="pricetag-outline" size={18} color="#666" />
                    <Text style={styles.eventType}>{item.category || item.type || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                    <MaterialIcons name="schedule" size={18} color="#666" />
                    <Text style={styles.eventDate}>{item.displayDate} @ {item.time}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.detailsButton}>
                    {/* In a complete app, this would navigate to the details screen */}
                    <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
                <Text style={styles.approvedText}>Approved</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={styles.loadingText}>Loading Approved Events...</Text>
            </SafeAreaView>
        );
    }


    return (
        <SafeAreaView style={styles.container}>
            {/* ---- Search Bar ---- */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search approved events..."
                    placeholderTextColor="#aaa"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* ---- Section Title ---- */}
            <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Approved Events</Text>
                <Text style={styles.countText}>{approvedEvents.length} events</Text>
            </View>

            <FlatList
                data={approvedEvents}
                keyExtractor={(item) => item.id}
                renderItem={renderEventCard}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No approved events found.</Text>
                }
            />
        </SafeAreaView>
    );
}

/* ===================================================
   STYLES  –  “Smart Events” theme ported from Events
   =================================================== */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f4f4",
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#0077B6',
        fontWeight: '600',
    },

    /* ---- 01  Header / Search ---- */
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 18,
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

    /* ---- 02  Section Title ---- */
    sectionTitleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#191823",
    },
    countText: {
        fontSize: 14,
        color: "#0077B6",
        fontWeight: "600",
    },

    /* ---- 03  Card ---- */
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
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f2f8ff", // Light blue background for icon
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#191823",
    },
    eventId: {
        fontSize: 12,
        color: "#8e8e8e",
        marginTop: 2,
    },

    cardBody: {
        marginVertical: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    eventType: {
        marginLeft: 8,
        fontSize: 14,
        color: "#555",
    },
    eventDate: {
        marginLeft: 8,
        fontSize: 14,
        color: "#0077B6",
        fontWeight: "500",
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#888',
    },

    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 14,
    },
    approvedText: {
        color: "#2e8b57", // Darker green for better contrast
        fontWeight: "700",
        fontSize: 14,
    },
    detailsButton: {
        backgroundColor: "#0077B6",
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 8,
        shadowColor: "#0077B6",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    detailsButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
});