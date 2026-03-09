import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import API_URL from "../../../config";
export default function AnalyticsExportScreen() {
    const navigation = useNavigation();
    const [exportFormat, setExportFormat] = useState("PDF");
    const [selectedDays, setSelectedDays] = useState(30);
    const [venueReports, setVenueReports] = useState([]);

    const dayOptions = [
        { label: "Last 7 Days", value: 7 },
        { label: "Last 14 Days", value: 14 },
        { label: "Last 30 Days", value: 30 },
        { label: "Last 60 Days", value: 60 },
        { label: "Last 90 Days", value: 90 },
    ];

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    // --- CRITICAL FIX APPLIED HERE: Token retrieval logic ---
    const fetchAnalyticsData = async () => {
        try {
            // 1. Get the user object to determine the role and token key
            const userJson = await AsyncStorage.getItem("user");

            if (!userJson) {
                Alert.alert("Authentication Required", "User data missing. Please log in.");
                navigation.reset({ index: 0, routes: [{ name: "AuthScreen" }] });
                return;
            }

            const user = JSON.parse(userJson);
            let tokenKey = "authToken"; // Default key

            // Map the role to the correct token key used during sign-in in Auth.js
            if (user.role === "ORGANIZER") {
                tokenKey = "ORGANISER_JWT_TOKEN";
            } else if (user.role === "ADMIN") {
                tokenKey = "ADMIN_JWT_TOKEN";
            }

            // 2. Retrieve the token using the correct, role-specific key
            const token = await AsyncStorage.getItem(tokenKey);

            if (!token) {
                Alert.alert("Authentication Required", "Token missing. Please log in to access analytics.");
                navigation.reset({ index: 0, routes: [{ name: "AuthScreen" }] });
                return;
            }

            // 3. Make the API call with the correct token
            //const response = await axios.post(`${API_URL}/auth/register`
            const res = await fetch(`${API_URL}/reports/analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // 4. Handle HTTP errors, including 401
            if (!res.ok) {
                if (res.status === 401) {
                    Alert.alert(
                        "Session Expired",
                        "Your session has expired or the token is invalid. Please log in again."
                    );
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "AuthScreen" }],
                    });
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            setVenueReports(data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            if (!error.message.includes("HTTP 401")) {
                Alert.alert("Error", "Could not fetch analytics data.");
            }
        }
    };

    const generatePDF = async () => {
        try {
            // HTML content remains the same
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: Helvetica; padding: 24px; }
                        h1 { color: #003399; text-align: center; }
                        h2 { text-align: center; font-size: 18px; margin-top: 5px; }
                        p { font-size: 14px; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Tshwane University of Technology</h1>
                    <h2>Venue Analytics Report</h2>
                    <p>Report Period: Last ${selectedDays} Days</p>
                    <table>
                        <tr>
                            <th>Venue</th>
                            <th>Events Hosted</th>
                            <th>Total Revenue (R)</th>
                        </tr>
                        ${venueReports
                    .map(
                        (v) =>
                            `<tr><td>${v.venueName}</td><td>${v.totalBookings}</td><td>R${v.totalRevenue}</td></tr>`
                    )
                    .join("")}
                    </table>
                    <p style="text-align:center; margin-top: 40px; color: #777;">
                        Generated by TUT Connect Analytics System
                    </p>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { dialogTitle: "Share Venue Report (PDF)" });
            Alert.alert("Success", "PDF report generated and ready to share.");
        } catch (error) {
            console.error("PDF Error:", error);
            Alert.alert("Error", "Failed to generate PDF.");
        }
    };

    const generateCSV = async () => {
        try {
            const csvHeader = "Venue,Events Hosted,Total Revenue (R)\n";
            const csvRows = venueReports
                .map((venue) => `${venue.venueName},${venue.totalBookings},R${venue.totalRevenue}`)
                .join("\n");

            const csvContent = csvHeader + csvRows;
            const fileUri = `${FileSystem.documentDirectory}venue_report_${Date.now()}.csv`;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            await Sharing.shareAsync(fileUri, { dialogTitle: "Share Venue Report (CSV)" });
            Alert.alert("Success", "CSV report generated and ready to share.");
        } catch (error) {
            console.error("CSV Error:", error);
            Alert.alert("Error", "Failed to generate CSV.");
        }
    };

    const handleGenerateReport = async () => {
        if (venueReports.length === 0) {
            Alert.alert("No Data", "No analytics data to export. Please try refreshing.");
            return;
        }

        if (exportFormat === "PDF") {
            await generatePDF();
        } else {
            await generateCSV();
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>📊 Venue Analytics & Exports</Text>

            <View style={styles.exportContainer}>
                <Text style={styles.subtitle}>Select Export Format</Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.formatButton, exportFormat === "PDF" && styles.selectedButton]}
                        onPress={() => setExportFormat("PDF")}
                    >
                        <Text style={[styles.buttonText, exportFormat === "PDF" && styles.selectedText]}>
                            PDF
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.formatButton, exportFormat === "Excel" && styles.selectedButton]}
                        onPress={() => setExportFormat("Excel")}
                    >
                        <Text style={[styles.buttonText, exportFormat === "Excel" && styles.selectedText]}>
                            CSV
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.durationContainer}>
                <View style={styles.durationHeader}>
                    <Ionicons name="calendar-outline" size={20} color="#003399" />
                    <Text style={styles.subtitle}>Select Report Period</Text>
                </View>

                <View style={styles.dayOptions}>
                    {dayOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.dayButton, selectedDays === option.value && styles.selectedButton]}
                            onPress={() => setSelectedDays(option.value)}
                        >
                            <Text style={[styles.buttonText, selectedDays === option.value && styles.selectedText]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport}>
                <Text style={styles.generateText}>Generate Report</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: "#f8f9fa" },
    title: { fontSize: 24, fontWeight: "bold", color: "#003399", textAlign: "center", marginBottom: 20 },
    exportContainer: { backgroundColor: "#fff", padding: 16, borderRadius: 10, marginBottom: 20, elevation: 2 },
    subtitle: { fontSize: 16, fontWeight: "600", color: "#333" },
    buttonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
    formatButton: { flex: 1, borderWidth: 1, borderColor: "#003399", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 5, alignItems: "center" },
    selectedButton: { backgroundColor: "#003399", borderColor: "#003399" },
    buttonText: { color: "#003399", fontWeight: "500" },
    selectedText: { color: "#fff" },
    durationContainer: { backgroundColor: "#fff", padding: 16, borderRadius: 10, marginBottom: 20, elevation: 2 },
    durationHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    dayOptions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginTop: 5 },
    dayButton: { borderWidth: 1, borderColor: "#ccc", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, margin: 4 },
    generateButton: { backgroundColor: "#003399", paddingVertical: 14, borderRadius: 10, alignItems: "center", elevation: 5 },
    generateText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});