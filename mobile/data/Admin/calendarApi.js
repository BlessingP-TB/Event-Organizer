// In app/data/Admin/calendarApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_URL from '@/config';

const BASE_URL = `${API_URL}/admin/calendars`;

const getAdminAuthConfig = async () => {
    const token = await AsyncStorage.getItem('ADMIN_JWT_TOKEN');

    if (!token) {
        const error = new Error('ADMIN_JWT_TOKEN_MISSING');
        error.code = 'ADMIN_JWT_TOKEN_MISSING';
        throw error;
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/**
 * Replaces the old getAvailableDates from calender.js
 */
export const getAvailableDates = async () => {
    try {
        const config = await getAdminAuthConfig();
        const response = await axios.get(BASE_URL, config);
        // The backend returns { success: true, data: [...] }
        return Array.isArray(response?.data?.data) ? response.data.data : [];
    } catch (error) {
        console.error("Failed to get available dates:", error?.response?.data || error?.message || error);
        return [];
    }
};

/**
 * Replaces the old addAvailableDates from calender.js
 */
export const addAvailableDates = async (newDates) => {
    try {
        const config = await getAdminAuthConfig();

        // The backend creates one at a time, so we must loop
        const promises = newDates.map(date => {
            // The backend expects date, startTime, endTime, venueIds
            // We remove 'id' if it exists, as this is a create operation
            const { id, ...data } = date;
            return axios.post(BASE_URL, data, config);
        });

        await Promise.all(promises);

        // After success, return the new list of all dates
        return await getAvailableDates();

    } catch (error) {
        console.error("Failed to add available dates:", error?.response?.data || error?.message || error);
        throw error;
    }
};

/**
 * Replaces the old updateAvailableDate from calender.js
 */
export const updateAvailableDate = async (updatedDate) => {
    try {
        const config = await getAdminAuthConfig();

        // The API route is /admin/calendars/:id
        // The body should be { date, startTime, endTime, venueIds }
        const { id, ...data } = updatedDate;

        await axios.patch(`${BASE_URL}/${id}`, data, config);

        // After success, return the new list of all dates
        return await getAvailableDates();
    } catch (error) {
        console.error("Failed to update available date:", error?.response?.data || error?.message || error);
        throw error;
    }
};

/**
 * Replaces the old deleteAvailableDate from calender.js
 */
export const deleteAvailableDate = async (id) => {
    try {
        const config = await getAdminAuthConfig();

        // The API route is /admin/calendars/:id
        await axios.delete(`${BASE_URL}/${id}`, config);

        // After success, return the new list of all dates
        return await getAvailableDates();
    } catch (error) {
        console.error("Failed to delete available date:", error?.response?.data || error?.message || error);
        throw error;
    }
};

/**
 * Replaces the old clearAvailableDates from calender.js
 */
export const clearAvailableDates = async () => {
    // This feature is not supported by the backend.
    // We will just log a warning and return the current dates.
    console.warn("clearAvailableDates is not supported by the backend API.");
    return await getAvailableDates();
};