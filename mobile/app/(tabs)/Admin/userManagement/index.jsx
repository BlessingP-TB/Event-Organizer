import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// Import the new API Client and token management functions
import { useNavigation } from "@react-navigation/native";
import apiClient, { clearAccessToken, getAccessToken, setTokens } from "../../../hooks/apiClient";

// --- Constants (Unchanged) ---
const ROLES = ["Attendee", "Organizer"];
const ALL_ROLES_FILTER = ["All", ...ROLES];
const ROLE_COLORS = {
    Attendee: "#2E8B57",
    Organizer: "#1E90FF",
};

// --- Authentication Hook (Unchanged) ---
const useInitialAuthToken = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    useEffect(() => {
        const fetchTokensAndSetGlobal = async () => {
            console.log("AUTH: Attempting to fetch tokens from AsyncStorage...");
            try {
                let storedAccessToken = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

                if (storedAccessToken) {
                    setTokens(storedAccessToken);
                    setHasValidSession(true);
                    console.log("AUTH: Access Token successfully set from storage.");
                } else {
                    setHasValidSession(false);
                    console.warn("AUTH: Access Token NOT found. Requires user login.");
                    await clearAccessToken();
                }
            } catch (e) {
                console.error("AUTH ERROR: Failed to retrieve auth tokens", e);
                setHasValidSession(false);
            } finally {
                setIsAuthReady(true);
            }
        };
        fetchTokensAndSetGlobal();
    }, []);

    return { isAuthReady, hasValidSession };
};

// --- Main Component ---
export default function UserManagement() {
    const navigation = useNavigation(); // ⭐️ Get navigation object
    const { isAuthReady, hasValidSession } = useInitialAuthToken();

    const [users, setUsers] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);

    // Filtering, Sorting, Pagination State
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState("All");
    const [sortBy] = useState('createdAt:desc');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Memoized filters: Creates the API query object based on STABLE state
    const filters = useMemo(() => {
        const filter = {};
        if (debouncedSearch.trim()) {
            filter.query = debouncedSearch.trim();
        }
        if (selectedRole !== "All") {
            filter.role = selectedRole.toUpperCase();
        }
        return filter;
    }, [debouncedSearch, selectedRole]);

    // ----------------------------------------------------
    // 1. Load Users Function (Unchanged)
    // ----------------------------------------------------
    // const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1); // ⭐️ NEW: Track total pages

    const loadUsers = async (isLoadMore = false) => { //⭐️ Add a parameter
        if (!getAccessToken()) {
            console.warn("loadUsers aborted: Access Token is missing.");
            setIsDataLoading(false);
            return;
        }
        // Don't load more if we are already on the last page
        if (isLoadMore && page >= totalPages) return;
        setIsDataLoading(true);

        const pageToFetch = isLoadMore ? page + 1 : 1;

        const endpoint = `/admin/users`;
        console.log(`API CALL: ${endpoint}`);

        // Construct params object matching backend expectations
        const params = {
            page: pageToFetch,
            pageSize: pageSize,
            sortBy,
            ...filters // filters contains 'query' and 'role'
        };

        try {
            const response = await apiClient.get(endpoint, { params });

            // ⭐️ Get pagination data from response
            setTotalPages(response.data.totalPages || 1);
            const usersArray = response.data.data || response.data.results || response.data.users || response.data;

            if (!Array.isArray(usersArray)) {
                Alert.alert("Data Error", "Server returned data in an unexpected format.");
                setUsers([]);
                return;
            }

            const enhancedUsers = usersArray.map(user => ({
                ...user,
                phone: user.phone || "N/A",
                id: user.id.toString(),
                role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Student',
            }));


            // ⭐️ Append or replace users
            if (isLoadMore) {
                setUsers(prevUsers => [...prevUsers, ...enhancedUsers]);
                setPage(pageToFetch); // ⭐️ Increment page state
            } else {
                setUsers(enhancedUsers);
                setPage(1); // ⭐️ Reset page state
            }
        } catch (error) {
            console.error("LOAD CATCH ERROR:", error.response?.data || error.message);
            Alert.alert("API Error", `Failed to fetch users: ${error.message}`);
        } finally {
            setIsDataLoading(false);
        }
    };

    // Handler to force a search immediately (Unchanged)
    const handleImmediateSearch = () => {
        setDebouncedSearch(search);

        if (page !== 1) {
            setPage(1);
        } else {
            loadUsers();
        }
    };

    // Handler for role filter (Unchanged)
    const handleRoleChange = (nextRole) => {
        setSelectedRole(nextRole);
        setDropdownOpen(false);

        if (page !== 1) {
            setPage(1);
        } else {
            loadUsers();
        }
    };


    // ----------------------------------------------------
    // 2. Debouncing Effect for Search Input (Unchanged)
    // ----------------------------------------------------
    useEffect(() => {
        const handler = setTimeout(() => {
            if (search !== debouncedSearch) {
                setDebouncedSearch(search);
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);


    // ----------------------------------------------------
    // 3. Main Load Trigger Effect (Unchanged)
    // ----------------------------------------------------
    useEffect(() => {
        if (isAuthReady && getAccessToken()) {
            loadUsers();
        } else if (isAuthReady && !getAccessToken()) {
            setUsers([]);
        }
    }, [isAuthReady, page, sortBy, filters]);

    // --- Helper Components ---
    const renderRoleBadge = (role) => (
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[role] || '#808080' }]}>
            <Text style={styles.roleBadgeText}>{role}</Text>
        </View>
    );

    // ⭐️ NEW: Overlay Component for guaranteed layering
    const RoleSelectionOverlay = () => {
        if (!dropdownOpen) return null;

        return (
            // The transparent full-screen overlay
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={() => setDropdownOpen(false)} // Close when tapping outside the menu
            >
                {/* The actual selection container, centered */}
                <View style={styles.selectionMenu}>
                    <Text style={styles.menuTitle}>Select User Role</Text>
                    {ALL_ROLES_FILTER.map((role) => (
                        <TouchableOpacity
                            key={role}
                            style={[
                                styles.dropdownItem,
                                selectedRole === role && styles.dropdownItemSelected,
                            ]}
                            onPress={() => handleRoleChange(role)}
                        >
                            <Text style={[
                                styles.dropdownItemText,
                                selectedRole === role && styles.dropdownItemTextSelected,
                            ]}>
                                {role}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        );
    };
    const handleUserPress = (user) => {
        console.log("Navigating to user:", user.name, user.id);
        // TODO: Navigate to a user detail screen
        // Example (if using React Navigation):
        navigation.navigate('AdminUserDetails', { userId: user.id });
    };
    // Component to serve as the header of the FlatList
    const ListHeader = () => (
        // Resetting headerContainer zIndex as the dropdown is now external
        <View style={styles.headerContainer}>
            <Text style={styles.listTitle}>User Management Search</Text>

            {/* Search/Filter UI */}
            <View style={styles.searchFilterArea}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Type name or email to search..."
                    value={search}
                    onChangeText={setSearch}
                    autoFocus={true}
                    onSubmitEditing={handleImmediateSearch}
                />

                {/* Filter Button to toggle overlay */}
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setDropdownOpen(true)} // Open the overlay
                >
                    <Text style={styles.filterText}>Role: {selectedRole} ▼</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listSeparator} />
        </View>
    );

    // --- JSX Rendering ---
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {isDataLoading && (
                <View style={styles.activityIndicatorOverlay}>
                    <ActivityIndicator size="large" color="#003087" />
                </View>
            )}

            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ListHeader}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleUserPress(item)} // 👈 Add onPress
                        activeOpacity={0.7} // (Optional) feedback on tap
                    >
                        < View style={styles.userItem}>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.name}</Text>
                                <Text style={styles.userEmail}>{item.email}</Text>
                                <Text style={styles.userPhone}>{item.cellphone_number}</Text>
                                {renderRoleBadge(item.role)}
                            </View>
                            <View style={styles.userActions} />
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}

                // ⭐️ ADD THESE PROPS
                onEndReached={() => loadUsers(true)} // Call loadUsers with isLoadMore = true
                onEndReachedThreshold={0.5} // How close to the end to trigger
                ListFooterComponent={
                    isDataLoading ? <ActivityIndicator size="small" color="#003087" /> : null
                }
            />

            {/* ⭐️ RENDERED OUTSIDE FLATLIST for proper zIndex stacking */}
            <RoleSelectionOverlay />

        </KeyboardAvoidingView>
    );
}

// --- Stylesheet (Updated for the new overlay) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f7fa" },
    activityIndicatorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 247, 250, 0.7)',
        zIndex: 10,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: '#f5f7fa',
    },
    listTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#003087",
        marginBottom: 10
    },
    listSeparator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 10,
    },
    searchFilterArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginRight: 10,
        backgroundColor: '#fff',
    },
    filterButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderColor: '#ccc',
        borderWidth: 1,
        minWidth: 100,
        alignItems: 'center',
    },
    filterText: {
        color: '#003087',
        fontWeight: '600',
    },
    listContent: { paddingBottom: 20 },
    userItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#003087", elevation: 1 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: "600", color: "#333" },
    userEmail: { fontSize: 14, color: "#666", marginTop: 2 },
    userPhone: { fontSize: 14, color: "#0077B6", marginTop: 2 },
    roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
    roleBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    userActions: { flexDirection: "row", gap: 16 },

    // ⭐️ NEW OVERLAY/MODAL STYLES
    overlay: {
        ...StyleSheet.absoluteFillObject, // Covers the entire screen
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999, // Extremely high zIndex to ensure it's on top
    },
    selectionMenu: {
        width: '80%',
        maxWidth: 300,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        elevation: 20, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#003087',
        textAlign: 'center',
    },
    dropdownItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dropdownItemText: {
        color: '#333',
        fontSize: 16,
    },
    dropdownItemSelected: {
        backgroundColor: '#e6f7ff',
        borderRadius: 4,
    },
    dropdownItemTextSelected: {
        fontWeight: 'bold',
        color: '#003087',
    },
});