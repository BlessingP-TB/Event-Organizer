// QrCode.jsx (Mobile - FIXED version)

import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getAttendeeRegistrations, getAttendeeTickets } from "../../../data/Organiser/myEvents";

// Helper to generate QR URL
const getQrCodeImageUrl = (qrCodeData) => {
    if (!qrCodeData) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeData)}&size=150x150`;
};

const normalizeRouteParam = (value) => (Array.isArray(value) ? value[0] : value);

const escapeHtml = (value) =>
        String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");

const toDisplayValue = (value) => {
        if (value === null || value === undefined || value === "") {
                return "N/A";
        }
        return String(value);
};

const formatDateTime = (value) => {
        if (!value) return "N/A";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
                return String(value);
        }
        return parsed.toLocaleString();
};

const formatPrice = (price) => {
        if (price === null || price === undefined || price === "") {
                return "N/A";
        }
        const numeric = Number(price);
        if (Number.isFinite(numeric)) {
                return `R${numeric.toFixed(2)}`;
        }
        return String(price);
};

const buildTicketPdfHtml = (ticket) => {
        const details = [
                ["Event Name", ticket.eventName],
                ["Event ID", ticket.eventId],
                ["Ticket ID", ticket.ticketId],
                ["Ticket Type", ticket.type],
                ["Status", ticket.status],
                ["Price", formatPrice(ticket.price)],
                ["Event Date", formatDateTime(ticket.eventDateTime)],
                ["Issued At", formatDateTime(ticket.issuedAt)],
                ["Redeemed At", formatDateTime(ticket.redeemedAt)],
                ["Last Synced", ticket.lastSynced],
                ["QR Text", ticket.qrText],
        ];

        const rows = details
                .map(
                        ([label, value]) => `
                        <tr>
                            <td class="label">${escapeHtml(label)}</td>
                            <td class="value">${escapeHtml(toDisplayValue(value))}</td>
                        </tr>
                `
                )
                .join("");

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Ticket - ${escapeHtml(ticket.eventName || "SmartEvents")}</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
                    .header { margin-bottom: 18px; }
                    .title { font-size: 22px; margin: 0; color: #0f172a; }
                    .sub { margin: 6px 0 0; color: #475569; font-size: 13px; }
                    .card { border: 1px solid #dbe3ee; border-radius: 10px; padding: 18px; }
                    .qr-wrap { text-align: center; margin: 8px 0 14px; }
                    .qr { width: 190px; height: 190px; border: 1px solid #e2e8f0; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; vertical-align: top; font-size: 13px; }
                    td.label { width: 34%; color: #334155; font-weight: 700; }
                    td.value { color: #0f172a; word-break: break-word; }
                    .footer { margin-top: 16px; font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">SmartEvents Ticket</h1>
                    <p class="sub">Generated on ${escapeHtml(new Date().toLocaleString())}</p>
                </div>
                <div class="card">
                    <div class="qr-wrap">
                        <img class="qr" src="${escapeHtml(ticket.qrCodeUrl || "")}" alt="Ticket QR Code" />
                    </div>
                    <table>
                        ${rows}
                    </table>
                </div>
                <div class="footer">
                    Keep this ticket safe. Present this QR code at event check-in.
                </div>
            </body>
            </html>
        `;
};

export default function CheckInScreen() {
    const params = useLocalSearchParams();
    // Destructure parameters passed via navigation
    const { eventId, eventName, qrCodeUrl, status, type, price } = params;

    const normalizedEventId = normalizeRouteParam(eventId);
    const normalizedEventName = normalizeRouteParam(eventName);
    const normalizedQrCodeUrl = normalizeRouteParam(qrCodeUrl);
    const normalizedStatus = normalizeRouteParam(status);
    const normalizedType = normalizeRouteParam(type);
    const normalizedPrice = normalizeRouteParam(price);

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
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
        if (normalizedQrCodeUrl) {
            // SUCCESS PATH: Data passed from navigation is used immediately.
            setTicket({
                eventName: normalizedEventName || 'N/A',
                eventId: normalizedEventId || 'N/A',
                ticketId: 'N/A',
                qrCodeUrl: getQrCodeImageUrl(normalizedQrCodeUrl),
                qrText: String(normalizedQrCodeUrl),
                status: normalizedStatus || 'Ready for Check-in',
                lastSynced: new Date().toLocaleTimeString(),
                type: normalizedType || "REGULAR",
                price: normalizedPrice,
                eventDateTime: null,
                issuedAt: null,
                redeemedAt: null,
            });
            setLoading(false);
            return true;
        }
        return false;
    }, [
        normalizedEventId,
        normalizedEventName,
        normalizedPrice,
        normalizedQrCodeUrl,
        normalizedStatus,
        normalizedType,
    ]);

    const handleDownloadTicket = useCallback(async () => {
        if (!ticket || isDownloading) {
            return;
        }

        try {
            setIsDownloading(true);
            const html = buildTicketPdfHtml(ticket);

            if (Platform.OS === 'web') {
                await Print.printToFileAsync({ html });
                Alert.alert('Save Ticket', 'Choose "Save as PDF" in your browser print dialog to download the ticket on your computer.');
                return;
            }

            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: 'Download Ticket PDF',
                    UTI: '.pdf',
                    mimeType: 'application/pdf',
                });
                return;
            }

            Alert.alert('Ticket Saved', `Ticket PDF saved at: ${uri}`);
        } catch (downloadError) {
            console.error('Failed to export attendee ticket PDF:', downloadError);
            Alert.alert('Download Failed', 'Could not generate the ticket PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    }, [isDownloading, ticket]);


    useEffect(() => {
        if (!normalizedEventId) {
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

                const eventTicket = tickets.find((t) => String(t.eventId) === String(normalizedEventId));

                if (eventTicket && eventTicket.qrcodeORurl?.[0]) {
                    // TICKET FOUND VIA API: Display it
                    const qrData = eventTicket.qrcodeORurl[0];
                    setTicket({
                        eventName: eventTicket.eventName || normalizedEventName || 'N/A',
                        eventId: eventTicket.eventId || normalizedEventId,
                        ticketId: eventTicket.id || 'N/A',
                        qrCodeUrl: getQrCodeImageUrl(qrData),
                        qrText: String(qrData),
                        status: eventTicket.redeemed ? 'Redeemed' : 'Ready for Check-in',
                        lastSynced: new Date().toLocaleTimeString(),
                        type: eventTicket.type || "REGULAR",
                        price: eventTicket.price,
                        eventDateTime: eventTicket.event?.startDateTime || null,
                        issuedAt: eventTicket.issuedAt || null,
                        redeemedAt: eventTicket.redeemedAt || null,
                    });
                    setLoading(false);
                    return;
                }

                // --- TICKET NOT FOUND: Check registrations and retry ---
                const registrations = await getAttendeeRegistrations();
                const eventRegistration = registrations.find((r) => String(r.eventId) === String(normalizedEventId));

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
                    const errorMessage = err?.message || '';
                    if (errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('expired')) {
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

        if (!normalizedQrCodeUrl) {
            fetchTicket();
        }

        return () => {
            isMounted = false;
        };
    }, [normalizedEventId, normalizedEventName, normalizedQrCodeUrl, retryAttempt, processInitialData]);

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
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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

                <View style={styles.qrTextContainer}>
                    <Text style={styles.qrTextLabel}>QR Text (Fallback)</Text>
                    <Text selectable style={styles.qrTextValue}>{ticket.qrText || 'N/A'}</Text>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Ticket ID:</Text> {ticket.ticketId || 'N/A'}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Event ID:</Text> {ticket.eventId || 'N/A'}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Type:</Text> {ticket.type}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Price:</Text> {formatPrice(ticket.price)}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Status:</Text> {ticket.status}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Event Date:</Text> {formatDateTime(ticket.eventDateTime)}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Issued At:</Text> {formatDateTime(ticket.issuedAt)}
                    </Text>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '600' }}>Redeemed At:</Text> {formatDateTime(ticket.redeemedAt)}
                    </Text>
                </View>

                {/* Button */}
                <TouchableOpacity
                    style={[styles.button, isDownloading && styles.buttonDisabled]}
                    onPress={handleDownloadTicket}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>{isDownloading ? 'Preparing Ticket PDF...' : 'Download Ticket PDF'}</Text>
                </TouchableOpacity>
            </View>

            {/* Sync Info */}
            <View style={styles.syncContainer}>
                <Ionicons name="cloud-done-outline" size={18} color="#777" />
                <Text style={styles.syncText}>Last synced: {ticket.lastSynced}</Text>
            </View>
        </ScrollView>
    );
}

// ... (styles remain the same) ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    contentContainer: { padding: 20, paddingBottom: 36 },
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
    qrTextContainer: {
        width: '100%',
        maxWidth: 170,
        marginBottom: 14,
        alignItems: 'center',
    },
    qrTextLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#555',
        marginBottom: 6,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    qrTextValue: {
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f3f4f6',
        color: '#111',
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
        fontFamily: 'monospace',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
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
    buttonDisabled: {
        backgroundColor: '#7aa4bb',
    },
    buttonText: { color: "#fff", fontWeight: "600" },
    syncContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 25 },
    syncText: { color: "#777", marginLeft: 5, fontSize: 13 },
});