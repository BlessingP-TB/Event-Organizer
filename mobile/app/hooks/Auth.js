import API_URL from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Alert } from "react-native";

/**
 * 🟩 Signup Function
 */
export const handleSignup = async (name, surname, email, phone, password, confirmPassword, role,) => {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, {
            name,
            // surname is intentionally excluded from the final payload (server does not expect it)
            email,
            cellphone_number: phone,
            password,
            verify_password: confirmPassword,
            role,
        });

        if (response.status === 201) {
            Alert.alert("Success", "Account created successfully. Please verify your email.");
            return response.data;
        } else {
            Alert.alert("Error", response.data.message || "Something went wrong.");
            return null;
        }
    } catch (error) {
        console.error("Signup error:", error.response?.data || error.message);
        Alert.alert("Error", error.response?.data?.message || "Failed to sign up.");
        return null;
    }
};

/**
 * 🟦 Signin Function (FIXED: Added ATTENDEE_JWT_TOKEN case)
 */
export const handleSignin = async (rememberMe, email, password, API_URL, router) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password,
        });

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

            await AsyncStorage.setItem(tokenKey, accessToken);
            await AsyncStorage.setItem("user", JSON.stringify(user));

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
        } else {
            Alert.alert("Error", error.response?.data?.message || "Login failed.");
        }
        return null;
    }
};