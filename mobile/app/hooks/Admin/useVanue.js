import API_URL from '@/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { useEffect, useState } from 'react';

// --- Utility function to get the token and config ---
const getAdminAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

    if (!token) {
        throw new Error("ADMIN_JWT_TOKEN_MISSING");
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const useAdminVenue = () => {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadVenues = async () => {
        try {
            setLoading(true);
            const config = await getAdminAuthHeaders();
            const response = await axios.get(`${API_URL}/admin/venues`, config);

            const venuesArray = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            setVenues(venuesArray);
            console.log("Fetched venues:", venuesArray);
        } catch (err) {
            if (err.message === "ADMIN_JWT_TOKEN_MISSING") {
                console.error('Error loading venues: Admin JWT token is missing.');
                setError({ message: "Authentication required. Please log in as Admin." });
            } else {
                console.error('Error loading venues:', err.response?.data || err);
                setError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVenues();
    }, []);

    const addNewVenue = async (venueData) => {
        try {
            setLoading(true);
            const config = await getAdminAuthHeaders();

            const payload = {
                name: venueData.name || '',
                location: venueData.location || '',
                price: venueData.price || 0,
                capacity: parseInt(venueData.capacity, 10) || 0,
                type: venueData.type ?? 'HALL',
                typeOther: venueData.typeOther ?? null,
                rateType: venueData.rateType ?? 'PER_DAY',
                depositValue: venueData.depositValue ?? null,
                rating: venueData.rating ?? 0,
                // Include tools if passed (for your other feature request)
                tools: venueData.tools || []
            };

            const response = await axios.post(`${API_URL}/admin/venues`, payload, config);

            setVenues((prev) => [...prev, response.data]);
            return response.data;
        } catch (err) {
            console.error('Error adding venue:', err.response?.data || err);
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateExistingVenue = async (venueData) => {
        try {
            setLoading(true);
            const config = await getAdminAuthHeaders();

            const payload = {
                name: venueData.name || '',
                location: venueData.location || '',
                price: venueData.price || 0,
                capacity: parseInt(venueData.capacity, 10) || 0,
                type: venueData.type ?? 'HALL',
                typeOther: venueData.typeOther ?? null,
                rateType: venueData.rateType ?? 'PER_DAY',
                depositValue: venueData.depositValue ?? null,
                rating: venueData.rating ?? 0,
                // Include tools if passed
                tools: venueData.tools || []
            };

            // 🚨 FIX: Changed axios.put to axios.patch
            const response = await axios.patch(
                `${API_URL}/admin/venues/${venueData.id}`,
                payload,
                config
            );

            setVenues((prev) =>
                prev.map((v) => (v.id === venueData.id ? response.data : v))
            );
        } catch (err) {
            console.error('Error updating venue:', err.response?.data || err);
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteExistingVenue = async (id) => {
        try {
            setLoading(true);
            const config = await getAdminAuthHeaders();

            await axios.delete(`${API_URL}/admin/venues/${id}`, config);

            setVenues((prev) => prev.filter((v) => v.id !== id));
        } catch (err) {
            console.error('Error deleting venue:', err.response?.data || err);
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        venues,
        addNewVenue,
        updateExistingVenue,
        deleteExistingVenue,
        reload: loadVenues,
        loading,
        error,
    };
};