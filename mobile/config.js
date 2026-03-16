import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_WEB_API_URL = "http://localhost:3000/api/v1";
const DEFAULT_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:3000/api/v1";

const getExpoDevHostApiUrl = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoGo?.debuggerHost ||
        Constants.manifest?.debuggerHost;

    if (!hostUri) {
        return null;
    }

    const host = hostUri.split(":")[0];
    return `http://${host}:3000/api/v1`;
};

const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === "web"
        ? DEFAULT_WEB_API_URL
        : getExpoDevHostApiUrl() || DEFAULT_ANDROID_EMULATOR_API_URL);

export default API_URL;
