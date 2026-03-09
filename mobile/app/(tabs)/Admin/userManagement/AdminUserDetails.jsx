import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import apiClient from '../../../hooks/apiClient'; // Adjust path if needed

// Helper to format dates
const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
};

// Component to render a single detail row
const DetailRow = ({ label, value, valueColor = '#333' }) => (
    <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
);

export default function AdminUserDetails() {
    const route = useRoute();
    const navigation = useNavigation();
    const { userId } = route.params; // Get the userId passed from the list

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) {
                Alert.alert("Error", "No user ID provided.");
                setIsLoading(false);
                return;
            }

            console.log(`Fetching details for user: ${userId}`);
            setIsLoading(true);
            try {
                const response = await apiClient.get(`/admin/users/${userId}`);
                setUser(response.data);
            } catch (err) {
                console.error("Failed to fetch user details:", err.response?.data || err.message);
                setError("Failed to load user profile. Please try again.");
                Alert.alert("API Error", "Failed to load user profile.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#003087" />
                <Text>Loading User Profile...</Text>
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>{error || "User data not found."}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Safely access nested data
    const emailVerified = user.account?.emailVerified;
    const isActive = user.active; // Assuming 'active' is on the user object

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerName}>{user.name}</Text>
                <Text style={styles.headerEmail}>{user.email}</Text>
            </View>

            {/* --- Account Details --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Details</Text>
                <DetailRow label="User ID" value={user.id} />
                <DetailRow label="Role" value={user.role} />
                <DetailRow label="Phone" value={user.cellphone_number || 'N/A'} />
            </View>

            {/* --- Status --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status</Text>
                <DetailRow
                    label="Account Active"
                    value={isActive ? 'Yes' : 'No'}
                    valueColor={isActive ? '#2E8B57' : '#DC143C'}
                />
                <DetailRow
                    label="Email Verified"
                    value={emailVerified ? 'Yes' : 'No'}
                    valueColor={emailVerified ? '#2E8B57' : '#DC143C'}
                />
                <DetailRow label="Joined On" value={formatDate(user.createdAt)} />
                <DetailRow label="Last Updated" value={formatDate(user.updatedAt)} />
            </View>

            {/* --- Organizer Profile (Conditional) --- */}
            {user.organizerProfile && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Organizer Profile</Text>
                    <DetailRow label="Profile Status" value={user.organizerProfile.status} />
                    <DetailRow label="Org. Name" value={user.organizerProfile.organization_name} />
                    <DetailRow label="Org. Type" value={user.organizerProfile.organization_type} />
                </View>
            )}

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back to List</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#DC143C',
        fontSize: 16,
        marginBottom: 20,
    },
    header: {
        backgroundColor: '#003087',
        padding: 20,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
    },
    headerName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    headerEmail: {
        fontSize: 16,
        color: '#eee',
        textAlign: 'center',
        marginTop: 4,
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003087',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 6,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    rowLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    backButton: {
        marginHorizontal: 16,
        marginTop: 30,
        backgroundColor: '#fff',
        borderColor: '#003087',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#003087',
        fontSize: 16,
        fontWeight: '600',
    }
});