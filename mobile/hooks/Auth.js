import API_URL from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Alert } from "react-native";
import { registerForPushNotificationsAndSync } from "@/hooks/pushNotifications";
import {
    ALLOWED_AUTH_EMAIL_MESSAGE,
    isAllowedAuthEmail,
    normalizeAuthEmail,
} from "@/utils/allowedAuthEmail";

const ROLE_TOKEN_KEYS = [
    "ADMIN_JWT_TOKEN",
    "ORGANISER_JWT_TOKEN",
    "ATTENDEE_JWT_TOKEN",
];

const getAuthErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.details?.[0]?.message
    || error?.response?.data?.message
    || fallbackMessage;

/**
 * 🟩 Signup Function
 */
export const handleSignup = async (name, surname, email, phone, password, confirmPassword, role,) => {
    try {
        const normalizedEmail = normalizeAuthEmail(email);

        if (!isAllowedAuthEmail(normalizedEmail)) {
            Alert.alert("Error", ALLOWED_AUTH_EMAIL_MESSAGE);
            return null;
        }

        const response = await axios.post(`${API_URL}/auth/register`, {
            name,
            // surname is intentionally excluded from the final payload (server does not expect it)
            email: normalizedEmail,
            cellphone_number: phone,
            password,
            verify_password: confirmPassword,
            role,
        }, { timeout: 20000 });

        if (response.status === 201) {
            Alert.alert("Success", "Account created successfully. You can now log in.");
            return response.data;
        } else {
            Alert.alert("Error", response.data.message || "Something went wrong.");
            return null;
        }
    } catch (error) {
        console.error("Signup error:", error.response?.data || error.message);
        Alert.alert("Error", getAuthErrorMessage(error, "Failed to sign up."));
        return null;
    }
};

/**
 * 🟦 Signin Function (FIXED: Added ATTENDEE_JWT_TOKEN case)
 */
export const handleSignin = async (rememberMe, email, password, API_URL, router) => {
    try {
        const normalizedEmail = normalizeAuthEmail(email);

        if (!isAllowedAuthEmail(normalizedEmail)) {
            Alert.alert("Error", ALLOWED_AUTH_EMAIL_MESSAGE);
            return null;
        }

        const response = await axios.post(`${API_URL}/auth/login`, {
            email: normalizedEmail,
            password,
        }, { timeout: 20000 });

        if (response.status === 200) {
            const { accessToken, user } = response.data;

            if (!accessToken || !user) {
                console.error("Login Error: Server response missing accessToken or user object.");
                Alert.alert("Login Failed", "Incomplete response from server. Please contact admin.");
                return null;
            }

            // --- FIX START: Ensure ATTENDEE token is saved correctly ---
            let tokenKey = "ATTENDEE_JWT_TOKEN"; // Default key for safety
            if (user.role === "ORGANIZER") {
                tokenKey = "ORGANISER_JWT_TOKEN";
            } else if (user.role === "ADMIN") {
                tokenKey = "ADMIN_JWT_TOKEN";
            } else if (user.role === "ATTENDEE") {
                // Explicitly define the key for Attendee, matching myEvents.js expectation
                tokenKey = "ATTENDEE_JWT_TOKEN"; 
            }
            // --- FIX END ---

            await AsyncStorage.multiRemove(ROLE_TOKEN_KEYS);
            await AsyncStorage.setItem(tokenKey, accessToken);
            await AsyncStorage.setItem("user", JSON.stringify(user));

            registerForPushNotificationsAndSync(accessToken).catch((error) => {
                console.warn(
                    "Push token sync failed:",
                    error?.response?.data || error?.message || error
                );
            });

            Alert.alert("Welcome", `Hello ${user.name}!`);

            // Role-based navigation
            switch (user.role) {
                case "ORGANIZER":
                    router.replace("/(tabs)/Organiser/orgaDash");
                    break;
                case "ATTENDEE":
                    // Redirects to a view that requires authentication
                    router.replace("/(tabs)/Attendee/Home");
                    break;
                case "ADMIN":
                    router.replace("/(tabs)/Admin/adminDash");
                    break;
                default:
                    Alert.alert("Error", "Unknown user role");
                    break;
            }

            return user;
        } else {
            Alert.alert("Error", "Invalid login credentials.");
            return null;
        }
    } catch (error) {
        console.error("Login error:", error.response?.data || error.message);

        if (error.message.includes("[AsyncStorage]")) {
            Alert.alert("Login Failed", "A problem occurred while trying to save your session. This is often due to an invalid API response.");
        } else if (error.code === "ECONNABORTED") {
            Alert.alert("Network Timeout", `Server did not respond in time. Check backend and API URL: ${API_URL}`);
        } else if (error.message === "Network Error") {
            Alert.alert("Network Error", `Cannot reach API at ${API_URL}. Ensure backend is running and phone/emulator can access it.`);
        } else {
            Alert.alert("Error", getAuthErrorMessage(error, "Login failed."));
        }
        return null;
    }
};