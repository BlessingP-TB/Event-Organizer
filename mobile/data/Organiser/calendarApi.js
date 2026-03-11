import API_URL from '@/config';
import apiClient from '../../hooks/apiClient'; // Import the client with the interceptor
// This reuses the admin route, which we unlocked for organizers in the backend
const BASE_URL = '/organizer/availability';

export const getOrganiserCalendarDates = async () => {
    try {
        // apiClient automatically adds the Authorization header
        //const response = await axios.post(`${API_URL}/auth/register`, {
        const response = await apiClient.get(`${API_URL}/organizer/availability`);

        if (response.data && response.data.success) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch calendar dates:", error);
        // Return empty array on error so the app doesn't crash
        return [];
    }
};