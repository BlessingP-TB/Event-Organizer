// app/hooks/apiClient.js
import API_URL from '@/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { Alert } from 'react-native';

let accessToken = null;

const TOKEN_KEYS = [
    'ADMIN_JWT_TOKEN',      // 👈 Move this to the top
    'ORGANISER_JWT_TOKEN',  // 👈 Move this second
    'authToken',            // Generic/Attendee token comes last
    'accessToken',
    'token',
];

export const setAccessToken = (token) => {
    accessToken = token ? `Bearer ${token}` : null;
};

// ✅ ALIAS: Added to support imports in UserManagement/index.jsx
export const setTokens = (token) => {
    setAccessToken(token);
};

// ✅ GETTER: Added to support checks in UserManagement/index.jsx
export const getAccessToken = () => {
    return accessToken;
};

export const clearAccessToken = async () => {
    accessToken = null;
    await AsyncStorage.multiRemove(TOKEN_KEYS);
};

const getStoredToken = async () => {
    for (const key of TOKEN_KEYS) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
    }
    return null;
};

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
    if (!accessToken) {
        const token = await getStoredToken();
        if (token) accessToken = `Bearer ${token}`;
    }

    if (accessToken) {
        config.headers.Authorization = accessToken;
    }

    return config;
});

export const getOrganiserAuthToken = async () => {
    const token = await AsyncStorage.getItem('ORGANISER_JWT_TOKEN');
    if (token) {
        accessToken = token; // Set the in-memory token
        console.log("API: Organiser token loaded from storage.");
    } else {
        console.error('Organiser auth token not found in storage.');
    }
    return token;
};

apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            await clearAccessToken();
            Alert.alert("Session Expired", "Please log in again.", [
                { text: "OK", onPress: () => { } }
            ]);
        }
        return Promise.reject(error);
    }
);

export default apiClient;