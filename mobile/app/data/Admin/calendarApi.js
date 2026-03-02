// In app/data/Admin/calendarApi.js
import { Alert } from 'react-native';
import apiClient from '../../hooks/apiClient'; // Uses your existing API client

const BASE_URL = '/admin/calendars';

/**
 * Replaces the old getAvailableDates from calender.js
 */
export const getAvailableDates = async () => {
    try {
        const response = await apiClient.get(BASE_URL);
        // The backend returns { success: true, data: [...] }
        return response.data.data;
    } catch (error) {
        console.error("Failed to get available dates:", error);
        Alert.alert("Error", "Could not load calendar dates from the server.");
        return [];
    }
};

/**
 * Replaces the old addAvailableDates from calender.js
 */
export const addAvailableDates = async (newDates) => {
    try {
        // The backend creates one at a time, so we must loop
        const promises = newDates.map(date => {
            // The backend expects date, startTime, endTime, venueIds
            // We remove 'id' if it exists, as this is a create operation
            const { id, ...data } = date;
            return apiClient.post(BASE_URL, data);
        });

        await Promise.all(promises);

        // After success, return the new list of all dates
        return await getAvailableDates();

    } catch (error) {
        console.error("Failed to add available dates:", error);
        Alert.alert("Error", "Could not save all new dates.");
        throw error;
    }
};

/**
 * Replaces the old updateAvailableDate from calender.js
 */
export const updateAvailableDate = async (updatedDate) => {
    try {
        // The API route is /admin/calendars/:id
        // The body should be { date, startTime, endTime, venueIds }
        const { id, ...data } = updatedDate;

        await apiClient.patch(`${BASE_URL}/${id}`, data);

        // After success, return the new list of all dates
        return await getAvailableDates();
    } catch (error) {
        console.error("Failed to update available date:", error);
        Alert.alert("Error", "Could not update the selected date.");
        throw error;
    }
};

/**
 * Replaces the old deleteAvailableDate from calender.js
 */
export const deleteAvailableDate = async (id) => {
    try {
        // The API route is /admin/calendars/:id
        await apiClient.delete(`${BASE_URL}/${id}`);

        // After success, return the new list of all dates
        return await getAvailableDates();
    } catch (error) {
        console.error("Failed to delete available date:", error);
        Alert.alert("Error", "Could not delete the selected date.");
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