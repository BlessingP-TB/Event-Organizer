import API_URL from "@/config"; // ensure this points to something like: http://192.168.x.x:3000/api
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/**
 * Helper to safely retrieve the JWT token from AsyncStorage.
 */
const getAuthToken = async () => {
    try {
        const userJson = await AsyncStorage.getItem("user");

        if (!userJson) {
            throw new Error("No user data found in storage.");
        }

        const user = JSON.parse(userJson);
        let token = user?.token;

        // 🔄 Secondary fallback: check for role-specific tokens
        if (!token && user.role) {
            let tokenKey = "authToken";
            if (user.role === "ORGANIZER") tokenKey = "ORGANISER_JWT_TOKEN";
            else if (user.role === "ADMIN") tokenKey = "ADMIN_JWT_TOKEN";
            else if (user.role === "ATTENDEE") tokenKey = "ATTENDEE_JWT_TOKEN";

            const secondaryToken = await AsyncStorage.getItem(tokenKey);
            if (secondaryToken) token = secondaryToken;
        }

        if (!token) {
            throw new Error("Authentication token missing from stored data.");
        }

        return token;
    } catch (err) {
        console.error("Token retrieval error:", err);
        throw err;
    }
};

/**
 * Custom React hook to fetch and manage the current user's profile data.
 */
export const useProfileData = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = await getAuthToken();

                // ✅ Always hit the authenticated profile route
                const response = await fetch(`${API_URL}/users/me`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                const contentType = response.headers.get("content-type");

                if (response.status === 401 || response.status === 403) {
                    // Unauthenticated — clear session
                    await AsyncStorage.multiRemove(["user", "userSession"]);
                    throw new Error("Your session has expired. Please log in again.");
                }

                if (!response.ok) {
                    let message = `Failed to fetch profile (Status ${response.status})`;

                    // Handle both JSON and HTML/text errors safely
                    if (contentType && contentType.includes("application/json")) {
                        const errJson = await response.json();
                        message = errJson.message || message;
                    } else {
                        const text = await response.text();
                        message = text.includes("<!DOCTYPE")
                            ? "Server returned HTML instead of JSON. Check backend route or URL."
                            : text;
                    }

                    throw new Error(message);
                }

                // ✅ Validate response type
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error(
                        "Unexpected response format — expected JSON from backend."
                    );
                }

                const profile = await response.json();

                // ✅ Normalize data for UI components
                const normalized = {
                    ...profile,
                    userInfo: [
                        {
                            label: "Name",
                            value: profile.name || profile.userName || "N/A",
                        },
                        {
                            label: "Email",
                            value: profile.email || "N/A",
                        },
                        {
                            label: "Cellphone",
                            value: profile.cellphone_number || "N/A",
                        },
                    ],
                };

                setData(normalized);
            } catch (err) {
                console.error("Profile fetch error:", err.message);
                setError(err.message);
                setData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    return { data, isLoading, error };
};
