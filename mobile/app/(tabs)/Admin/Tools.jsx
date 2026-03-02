import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// 🚨 FIX: Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from "../../../config";


export default function Tools() {
    const [resources, setResources] = useState([]);
    const [resourceData, setResourceData] = useState({ name: "", quantity: "" });
    const [editId, setEditId] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(""); // <-- Added state for errors

    const navigation = useNavigation();

    // Fetch tools
    const fetchResources = async () => {
        setLoading(true);
        setError("");
        const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

        const res = await fetch(`${API_URL}/admin/tools`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // 🚨 FIX: Ensure token is used for fetch
                Authorization: `Bearer ${token}`,
            },
        });

        try {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text}`);
            }
            const result = await res.json();
            if (!result.data) throw new Error("No data returned from API");
            setResources(Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        navigation.setOptions({ title: "Tools", headerShown: true });
        fetchResources();
    }, []);

    const openModal = (resource = null) => {
        if (resource) {
            setResourceData({
                name: resource.name,
                quantity: resource.quantity?.toString() ?? "",
            });
            setEditId(resource.id);
        } else {
            setResourceData({ name: "", quantity: "" });
            setEditId(null);
        }
        setModalVisible(true);
    };

    // Save or update tool
    const handleSave = async () => {
        const { name, quantity } = resourceData;
        if (!name || !quantity) {
            Alert.alert("Missing Fields", "Please fill in all fields.");
            return;
        }

        try {
            setError(""); // Clear previous errors
            const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN"); // 🚨 FIX: Get token for protected POST/PATCH

            const payload = { name, quantity: parseInt(quantity) };
            const url = editId ? `${API_URL}/admin/tools/${editId}` : `${API_URL}/admin/tools`;
            const method = editId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // 🚨 FIX: Add token to protected routes
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Update failed: HTTP ${res.status}: ${text}`);
            }

            await fetchResources();
            setModalVisible(false);
            setResourceData({ name: "", quantity: "" });
        } catch (err) {
            console.error("Save error:", err);
            setError(err.message); // Display error on screen
        }
    };

    // Delete tool
    const handleDelete = (id) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this tool?", [
            { text: "Cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setError(""); // Clear previous errors
                        const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN"); // 🚨 FIX: Get token for protected DELETE

                        const res = await fetch(`${API_URL}/admin/tools/${id}`, {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`, // 🚨 FIX: Add token to protected routes
                            },
                        });

                        if (!res.ok) {
                            const text = await res.text(); // Get full response
                            throw new Error(`Delete failed: HTTP ${res.status}: ${text}`);
                        }

                        // Refresh the list after successful delete
                        fetchResources();
                    } catch (err) {
                        console.error("Delete error:", err);
                        setError(err.message); // Show full error on screen
                    }
                },
            },
        ]);
    };


    return (
        <View style={styles.container}>
            <Text style={styles.header}>Tools</Text>

            <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
                <Feather name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Tool</Text>
            </TouchableOpacity>

            {loading && <Text style={styles.centerText}>Loading tools...</Text>}
            {!loading && error !== "" && (
                <Text style={[styles.centerText, { color: "red" }]}>
                    Error: {error}
                </Text>
            )}
            {!loading && !error && resources.length === 0 && (
                <Text style={styles.centerText}>No tools found</Text>
            )}

            <ScrollView style={styles.list}>
                {resources.map((item) => (
                    <View key={item.id} style={styles.niceCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSub}>Quantity: {item.quantity ?? 0}</Text>
                        </View>

                        <View style={styles.iconRow}>
                            <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}>
                                <Feather name="edit" size={20} color="#0077B6" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                                <Feather name="trash-2" size={20} color="#d9534f" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalHeader}>{editId ? "Edit Tool" : "Add Tool"}</Text>

                        <TextInput
                            placeholder="Tool Name"
                            style={styles.input}
                            value={resourceData.name}
                            onChangeText={(t) => setResourceData({ ...resourceData, name: t })}
                        />
                        <TextInput
                            placeholder="Quantity"
                            style={styles.input}
                            keyboardType="number-pad"
                            value={resourceData.quantity}
                            onChangeText={(t) => setResourceData({ ...resourceData, quantity: t })}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>{editId ? "Update" : "Save"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 22, backgroundColor: "#F7F9FC" },
    header: { fontSize: 28, fontWeight: "700", marginBottom: 18, color: "#021526" },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0077B6",
        padding: 14,
        borderRadius: 14,
        marginBottom: 20,
        elevation: 3,
    },
    addButtonText: { color: "#fff", marginLeft: 10, fontSize: 16, fontWeight: "600" },
    centerText: { textAlign: "center", color: "#777", marginVertical: 10 },
    list: { marginTop: 10 },
    niceCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 14,
        marginBottom: 15,
        alignItems: "center",
        elevation: 2,
    },
    cardTitle: { fontSize: 20, fontWeight: "700", color: "#021526" },
    cardSub: { marginTop: 4, color: "#777", fontSize: 15 },
    iconRow: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
    iconBtn: { padding: 4 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    modal: { backgroundColor: "#fff", width: "88%", padding: 22, borderRadius: 14 },
    modalHeader: { fontSize: 22, fontWeight: "700", marginBottom: 15 },
    input: { backgroundColor: "#f0f0f0", padding: 13, borderRadius: 10, marginBottom: 14 },
    modalActions: { flexDirection: "row", justifyContent: "space-between" },
    saveBtn: { backgroundColor: "#0077B6", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
    saveBtnText: { color: "#fff", fontWeight: "700" },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 25 },
    cancelBtnText: { color: "#d9534f", fontWeight: "700" },
});