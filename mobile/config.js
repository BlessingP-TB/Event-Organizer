import Constants from "expo-constants";
import { Platform } from "react-native";

const normalizeBaseUrl = (value) => value?.replace(/\/$/, "");

const getExpoHost = () => {
    const hostUri =
        Constants?.expoConfig?.hostUri ||
        Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
        Constants?.manifest?.debuggerHost;

    if (!hostUri) return null;
    return hostUri.split(":")[0];
};

const resolveApiUrl = () => {
    const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
    if (envUrl) return envUrl;

    if (Platform.OS === "web") {
        return "http://localhost:3000/api/v1";
    }

    const expoHost = getExpoHost();
    if (expoHost) {
        return `http://${expoHost}:3000/api/v1`;
    }

    if (Platform.OS === "android") {
        // Android emulator loopback mapping
        return "http://10.0.2.2:3000/api/v1";
    }

    // iOS simulator fallback
    return "http://localhost:3000/api/v1";
};

const API_URL = resolveApiUrl();

export default API_URL;
