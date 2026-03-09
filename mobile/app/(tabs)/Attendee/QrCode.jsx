// QrCode.jsx (Mobile - FIXED version)

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getAttendeeRegistrations, getAttendeeTickets } from "../../data/Organiser/myEvents";

// Helper to generate QR URL
const getQrCodeImageUrl = (qrCodeData) => {
    if (!qrCodeData) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeData)}&size=150x150`;
};

export default function CheckInScreen() {
    const params = useLocalSearchParams();
    // Destructure parameters passed via navigation
    const { eventId, eventName, qrCodeUrl, status, type, price } = params;

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const MAX_RETRIES = 3;

    // Helper to start the fetch cycle
    const startFetch = () => {
        setLoading(true);
        setError(null);
        setTicket(null);
        setRetryAttempt(prev => prev + 1);
    };

    // Helper function to process initial navigation parameters
    const processInitialData = useCallback(() => {
        if (qrCodeUrl) {
            // SUCCESS PATH: Data passed from navigation is used immediately.
            setTicket({
                eventName: eventName || 'N/A',
                qrCodeUrl: getQrCodeImageUrl(qrCodeUrl),
                status: status || 'Ready for Check-in',
                lastSynced: new Date().toLocaleTimeString(),
                type: type || "REGULAR",
                price: price,
            });
            setLoading(false);
            return true;
        }
        return false;
    }, [eventName, qrCodeUrl, status, type, price]);


    useEffect(() => {
        if (!eventId) {
            setLoading(false);
            setError("Missing event ID.");
            return;
        }

        // 1. TRY TO USE PASSED DATA FIRST (Prioritize immediate display)
        if (processInitialData()) {
            return;
        }

        // 2. FALLBACK TO API FETCH/RETRY
        if (retryAttempt >= MAX_RETRIES) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchTicket = async () => {
            try {
                console.log("Fetching tickets for event:", eventId);

                // --- API FETCH LOGIC ---
                const tickets = await getAttendeeTickets();

                if (!isMounted) return;

                const eventTicket = tickets.find(t => t.eventId === eventId);

                if (eventTicket && eventTicket.qrcodeORurl?.[0]) {
                    // TICKET FOUND VIA API: Display it
                    const qrData = eventTicket.qrcodeORurl[0];
                    setTicket({
                        eventName: eventTicket.eventName,
                        qrCodeUrl: getQrCodeImageUrl(qrData),
                        status: eventTicket.redeemed ? 'Redeemed' : 'Ready for Check-in',
                        lastSynced: new Date().toLocaleTimeString(),
                        type: eventTicket.type || "REGULAR",
                        price: eventTicket.price,
                    });
                    setLoading(false);
                    return;
                }

                // --- TICKET NOT FOUND: Check registrations and retry ---
                const registrations = await getAttendeeRegistrations();
                const eventRegistration = registrations.find(r => r.eventId === eventId);

                if (eventRegistration) {
                    // Check for APPROVED or ALLOCATED to trigger retries
                    if (eventRegistration.status === 'APPROVED' || eventRegistration.status === 'ALLOCATED') {
                        if (retryAttempt < MAX_RETRIES - 1) {
                            const delayMs = retryAttempt === 0 ? 0 : 500;

                            console.log(`Approved/Allocated but no ticket. Retrying in ${delayMs / 1000}s (Attempt ${retryAttempt + 1})...`);

                            if (delayMs > 0) {
                                await new Promise(resolve => setTimeout(resolve, delayMs));
                            }

                            if (isMounted) startFetch();
                            return;
                        } else {
                            setError("Your registration is approved/allocated, but the ticket is not yet issued. Please contact the organizer.");
                        }
                    } else if (eventRegistration.status === 'PENDING') {
                        setError("Your registration is pending approval. Please wait for confirmation.");
                    } else {
                        setError(`Your registration was ${eventRegistration.status}. Please contact organizer.`);
                    }
                } else {
                    setError("You are not registered or have not purchased a ticket for this event.");
                }

            } catch (err) {
                console.error("Error fetching data:", err);
                if (isMounted) {
                    // Handles UNAUTHORIZED/Session Expired errors
                    if (err.message && err.message.includes('UNAUTHORIZED') || err.message.includes('expired')) {
                        setError("Please log in to view your ticket (Session Expired).");
                    } else {
                        setError("Failed to load ticket/registration data. Please check your connection and try again.");
                    }
                }
            } finally {
                if (isMounted && !ticket && !error) {
                    setLoading(false);
                }
            }
        };

        if (!qrCodeUrl) {
            fetchTicket();
        }

        return () => {
            isMounted = false;
        };
    }, [eventId, retryAttempt, qrCodeUrl, processInitialData]);

    // --- RENDERING ---

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077B6" />
                <Text style={{ marginTop: 10 }}>Loading Ticket (Attempt {retryAttempt + 1} of {MAX_RETRIES})...</Text>
            </View>
        );
    }

    if (error || !ticket) {
        // Check if the error requires a login prompt
        const requiresLogin = error && error.includes('Session Expired');

        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
                <Text style={{ color: "#ff6b6b", marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
                    {error || "No ticket found. You may need to register or contact the organizer."}
                </Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#ff6b6b', marginTop: 20 }]}
                    onPress={() => {
                        if (requiresLogin) {
                            // TODO: Implement navigation to the login screen here
                            console.log("NAVIGATE TO LOGIN SCREEN");
                        } else {
                            setRetryAttempt(0);
                            startFetch();
                        }
                    }}
                >
                    <Text style={styles.buttonText}>{requiresLogin ? "Go to Login" : "Retry"}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Your QR Code</Text>
            </View>

            {/* Ticket Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Event Ticket</Text>
                <Text style={styles.subtitle}>{ticket.eventName}</Text>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                    <Image source={{ uri: ticket.qrCodeUrl }} style={styles.qrCode} />
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Type:</Text> {ticket.type}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Status:</Text> {ticket.status}
                    </Text>
                </View>

                {/* Button */}
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>View Event Details</Text>
                </TouchableOpacity>
            </View>

            {/* Sync Info */}
            <View style={styles.syncContainer}>
                <Ionicons name="cloud-done-outline" size={18} color="#777" />
                <Text style={styles.syncText}>Last synced: {ticket.lastSynced}</Text>
            </View>
        </View>
    );
}

// ... (styles remain the same) ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA", padding: 20 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        paddingVertical: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333"
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333"
    },
    subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
    qrContainer: { backgroundColor: "#000", borderRadius: 12, padding: 10, marginBottom: 15 },
    qrCode: { width: 150, height: 150 },
    infoSection: {
        alignSelf: 'stretch',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: "#444",
        marginBottom: 5,
    },
    button: {
        backgroundColor: "#0077B6",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 10,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: { color: "#fff", fontWeight: "600" },
    syncContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 25 },
    syncText: { color: "#777", marginLeft: 5, fontSize: 13 },
});