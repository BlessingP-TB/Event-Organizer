import API_URL from '@/config';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getOrganiserEvents } from '../../data/Organiser/myEvents';
import { getOrganiserAuthToken, } from '../../hooks/apiClient';

// Constant for the only allowed document type
const DOC_TYPE_INVOICE = 'INVOICE';

export default function UploadDocument() {
    // The document type is now fixed as INVOICE
    const [fileAsset, setFileAsset] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    // STATES FOR EVENT SELECTION
    const [organizerEvents, setOrganizerEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(null); // Initial value is null
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);


    // Load events only once on component mount for the fixed INVOICE type
    useEffect(() => {
        loadEvents();
    }, []);

    // FIX APPLIED HERE: Robust array check and initial selection logic
    const loadEvents = async () => {
        setIsLoadingEvents(true);
        setOrganizerEvents([]);
        setSelectedEventId(null);

        try {
            const events = await getOrganiserEvents();

            // 1. Robust Check: Ensure 'events' is an array, even if empty.
            const eventArray = Array.isArray(events) ? events : [];

            if (eventArray.length > 0) {
                setOrganizerEvents(eventArray);
                // 2. Set the Picker's value to the first event's ID, or null if only one element is in the Picker.
                setSelectedEventId(eventArray[0].id);
            }

        } catch (error) {
            console.error('Failed to load organizer events:', error);
            Alert.alert('Error', error.message || 'Failed to load your organized events. Please check your network connection.');
        } finally {
            setIsLoadingEvents(false);
        }
    };


    /**
     * Handles file selection using expo-document-picker.
     */
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setFileAsset(result.assets[0]);
            } else {
                setFileAsset(null);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document.');
        }
    };

    /**
     * Handles the file upload process.
     */
    const handleUpload = async () => {
        if (!fileAsset) {
            Alert.alert('Error', 'Please select a file to upload.');
            return;
        }

        // Validation for required selectedEventId for INVOICE type (which is now mandatory)
        if (!selectedEventId) {
            Alert.alert('Validation Error', 'Please select an event related to this invoice.');
            return;
        }

        // Validation for missing or zero size
        if (!fileAsset.size || fileAsset.size <= 0) {
            Alert.alert('Validation Error', 'File size information is missing or zero. Please select a valid file.');
            return;
        }

        setIsUploading(true);
        let contentBase64 = null;

        try {
            // --- 1. Conditional File Content Reading ---
            if (Platform.OS === 'web') {
                const fetchedFile = await fetch(fileAsset.uri);
                const blob = await fetchedFile.blob();

                contentBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

            } else {
                const fileInfo = await FileSystem.getInfoAsync(fileAsset.uri);
                if (!fileInfo.exists) {
                    throw new Error('File not found in cache. Please try selecting it again.');
                }

                let rawBase64 = await FileSystem.readAsStringAsync(fileAsset.uri, {
                    encoding: 'base64',
                });

                let cleanedBase64 = rawBase64;
                const prefixIndex = rawBase64.indexOf(',');

                if (prefixIndex !== -1) {
                    cleanedBase64 = rawBase64.substring(prefixIndex + 1);
                }

                const requiredPadding = 4 - (cleanedBase64.length % 4);
                if (requiredPadding < 4) {
                    cleanedBase64 += '==='.slice(0, requiredPadding);
                }

                contentBase64 = cleanedBase64;
            }

            // --- 2. Authentication and API Call ---
            const token = await getOrganiserAuthToken();
            if (!token) {
                Alert.alert('Authentication Error', 'You must be logged in to upload documents.');
                setIsUploading(false);
                return;
            }

            // Document body is now fixed for INVOICE type
            const docBody = {
                type: DOC_TYPE_INVOICE,
                content: contentBase64,
                filename: fileAsset.name,
                size: fileAsset.size,
                mimetype: fileAsset.mimeType || 'application/octet-stream',
                // Pass the selected Event ID
                eventId: selectedEventId,
                purchaseId: null, // Keep existing null structure
                bookingId: null, // Keep existing null structure
            };

            // Send the request as JSON
            const response = await fetch(`${API_URL}/documents/me/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(docBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Upload failed with status: ${response.status}.`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage += ` Server message: ${errorText.substring(0, 100)}...`;
                }
                throw new Error(errorMessage);
            }

            // --- SUCCESS BLOCK ---
            const successMsg = `Invoice "${fileAsset.name}" submitted for review, linked to event ID: ${selectedEventId}.`;
            setSuccessMessage(successMsg);
            setTimeout(() => {
                setSuccessMessage(null); // Hide toast after 3 seconds
            }, 3000);

            // Clear form
            setFileAsset(null);
            // Note: selectedEventId is intentionally NOT reset to keep the context for the next upload, but loadEvents would handle reset on its own if re-run.

        } catch (error) {
            console.error('Upload failed:', error);
            Alert.alert('Error', error.message || 'Document upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // Helper to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch (e) {
            return dateString.substring(0, 10); // Fallback to YYYY-MM-DD
        }
    };

    const isSubmitDisabled = isUploading || !fileAsset || !selectedEventId;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.contentContainer}>
                <Text style={styles.header}>Upload Event Invoice</Text>
                <Text style={styles.subheader}>
                    Upload an **INVOICE** related to one of your organized events.
                </Text>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
                    <Text style={styles.infoText}>Document Type: **INVOICE**</Text>
                </View>

                {/* Event Picker for Invoice Type (now mandatory) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Related Event</Text>
                    <View style={styles.pickerContainer}>
                        {isLoadingEvents ? (
                            <ActivityIndicator size="small" color="#0077B6" style={styles.loadingIndicator} />
                        ) : organizerEvents.length > 0 ? (
                            <Picker
                                selectedValue={selectedEventId}
                                onValueChange={(itemValue) => setSelectedEventId(itemValue)}
                                style={styles.picker}
                            >
                                {/* Default Item, value is null to enforce selection check */}
                                <Picker.Item label="--- Select an Event ---" value={null} />
                                {organizerEvents.map(event => (
                                    <Picker.Item
                                        key={event.id}
                                        label={`${event.title} (${formatDate(event.startDateTime)})`}
                                        value={event.id}
                                    />
                                ))}
                            </Picker>
                        ) : (
                            <Text style={styles.noEventsText}>
                                No organized events found. You must create an event before uploading an invoice.
                            </Text>
                        )}
                    </View>
                </View>
                {/* End Event Picker */}


                {/* File Picker Button */}
                <TouchableOpacity style={styles.filePickerButton} onPress={pickDocument} disabled={isUploading}>
                    <Ionicons name="document-text-outline" size={24} color="#0077B6" />
                    <Text style={styles.filePickerText}>
                        {fileAsset ? fileAsset.name : 'Select Invoice File'}
                    </Text>
                </TouchableOpacity>

                {/* Selected File Info */}
                {fileAsset && (
                    <View style={styles.fileInfo}>
                        <Feather name="file-text" size={16} color="#333" />
                        <Text style={styles.fileName} numberOfLines={1}>{fileAsset.name}</Text>
                        <TouchableOpacity onPress={() => { setFileAsset(null); }}>
                            <Ionicons name="close-circle" size={20} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Upload Button */}
                <TouchableOpacity
                    style={[styles.uploadButton, isSubmitDisabled && styles.uploadButtonDisabled]}
                    onPress={handleUpload}
                    disabled={isSubmitDisabled}
                >
                    <Text style={styles.uploadButtonText}>
                        {isUploading ? 'Uploading...' : 'Submit Invoice'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Toast UI Component */}
            {successMessage && (
                <View style={styles.toastContainer}>
                    <Text style={styles.toastText}>✅ {successMessage}</Text>
                </View>
            )}

        </View>
    );
}

// --- Styles ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        color: '#333',
    },
    subheader: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6f7ff',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#0077B6',
        marginBottom: 20,
    },
    infoText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#0077B6',
        fontWeight: '500',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    pickerContainer: {
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    pickerItem: {
        fontSize: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    loadingIndicator: {
        paddingVertical: 15,
    },
    noEventsText: {
        paddingVertical: 15,
        textAlign: 'center',
        color: '#999',
    },
    filePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e6f7ff',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0077B6',
        marginBottom: 20,
    },
    filePickerText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#0077B6',
        fontWeight: '500',
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        marginBottom: 20,
    },
    fileName: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#333',
    },
    uploadButton: {
        backgroundColor: '#0077B6',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    uploadButtonDisabled: {
        backgroundColor: '#999',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Toast Styles
    toastContainer: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        zIndex: 1000,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    toastText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        textAlign: 'center',
    },
});