import { Platform } from "react-native";

const API_URL =
    Platform.OS === "web"
        ? "http://localhost:3000/api/v1"
        : "http://168.172.243.241:3000/api/v1";

export default API_URL;
