import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import API_URL from '@/config';

const ROLE_TOKEN_KEYS = {
    ADMIN: 'ADMIN_JWT_TOKEN',
    ORGANIZER: 'ORGANISER_JWT_TOKEN',
    ATTENDEE: 'ATTENDEE_JWT_TOKEN',
};

const FALLBACK_TOKEN_KEYS = [
    ...Object.values(ROLE_TOKEN_KEYS),
    'authToken',
    'accessToken',
    'token',
];

const isPhysicalDevice = () => {
    if (typeof Constants.isDevice === 'boolean') {
        return Constants.isDevice;
    }

    // In some runtime modes Constants.isDevice may be undefined; only web is guaranteed non-device.
    return Platform.OS !== 'web';
};

const isExpoGoAndroid = () => Platform.OS === 'android' && Constants.appOwnership === 'expo';

const resolveProjectId = () => {
    return (
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        || Constants.expoConfig?.extra?.eas?.projectId
        || Constants.expoConfig?.extra?.projectId
        || Constants.manifest2?.extra?.eas?.projectId
        || Constants.manifest2?.extra?.projectId
        || Constants.manifest?.extra?.eas?.projectId
        || Constants.manifest?.extra?.projectId
        || Constants.easConfig?.projectId
        || null
    );
};

const getStoredAuthToken = async () => {
    try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const roleTokenKey = ROLE_TOKEN_KEYS[parsedUser?.role];
            if (roleTokenKey) {
                const roleToken = await AsyncStorage.getItem(roleTokenKey);
                if (roleToken) {
                    return roleToken;
                }
            }
        }
    } catch (error) {
        console.warn('Failed to resolve push auth token from stored user:', error?.message || error);
    }

    for (const key of FALLBACK_TOKEN_KEYS) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
    }

    return null;
};

const ensureAndroidChannel = async () => {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
    });
};

const createPushSetupError = async () => {
    if (!isPhysicalDevice()) {
        const error = new Error('Push notifications require a physical device.');
        error.code = 'PUSH_REQUIRES_DEVICE';
        return error;
    }

    if (isExpoGoAndroid()) {
        const error = new Error('Remote push notifications are not supported in Expo Go on Android. Use a development build.');
        error.code = 'EXPO_GO_ANDROID_PUSH_UNSUPPORTED';
        return error;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
        const error = new Error('Push is not configured: missing Expo projectId. Set EXPO_PUBLIC_EAS_PROJECT_ID and restart the app.');
        error.code = 'PUSH_PROJECT_ID_MISSING';
        return error;
    }

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
        const error = new Error('Notification permission has not been granted on this device.');
        error.code = 'PUSH_PERMISSION_NOT_GRANTED';
        return error;
    }

    const error = new Error('Expo push token registration failed on this device.');
    error.code = 'PUSH_TOKEN_REGISTRATION_FAILED';
    return error;
};

export const registerForPushNotificationsAndSync = async (accessToken) => {
    if (!isPhysicalDevice()) {
        return null;
    }

    if (isExpoGoAndroid()) {
        return null;
    }

    const authToken = accessToken || await getStoredAuthToken();
    if (!authToken) {
        return null;
    }

    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const permissionResponse = await Notifications.requestPermissionsAsync();
        finalStatus = permissionResponse.status;
    }

    if (finalStatus !== 'granted') {
        return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
        return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    const expoPushToken = tokenResponse?.data;
    if (!expoPushToken) {
        return null;
    }

    await axios.post(
        `${API_URL}/notifications/push-token`,
        {
            token: expoPushToken,
            platform: Platform.OS,
        },
        {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        }
    );

    return expoPushToken;
};

export const unregisterPushNotifications = async (accessToken, pushToken) => {
    const authToken = accessToken || await getStoredAuthToken();
    if (!authToken) return;

    await axios.delete(`${API_URL}/notifications/push-token`, {
        headers: {
            Authorization: `Bearer ${authToken}`,
        },
        data: {
            token: pushToken,
        },
    });
};

export const triggerTestPushNotification = async (payload = {}) => {
    const authToken = await getStoredAuthToken();
    if (!authToken) {
        const error = new Error('AUTH_TOKEN_MISSING');
        error.code = 'AUTH_TOKEN_MISSING';
        throw error;
    }

    const registeredPushToken = await registerForPushNotificationsAndSync(authToken);
    if (!registeredPushToken) {
        throw await createPushSetupError();
    }

    const response = await axios.post(
        `${API_URL}/notifications/test`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        }
    );

    return response?.data;
};
