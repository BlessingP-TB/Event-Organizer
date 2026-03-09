// hooks/organiser/useOrgaDash.js
import API_URL from '@/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { useEffect, useState } from 'react';

// Define the initial state structure
// Updated to match Code 1: Events, Registrations, Attendance, Rating
const initialData = {
  stats: {
    totalEvents: { value: '0', change: { amount: '0', type: 'increase' } },
    totalRegistrations: { value: '0', change: { amount: '0', type: 'increase' } },
    totalAttendance: { value: '0', change: { amount: '0', type: 'increase' } },
    averageRating: { value: '0', change: { amount: '0', type: 'increase' } },
  },
  notifications: [],
};

/**
 * 🎣 Custom hook for fetching Organizer Dashboard statistics.
 * Updated to match endpoints and logic from the Web Dashboard.
 */
export const useOrgaDash = () => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // --- 1. Retrieve Credentials from AsyncStorage ---
        const token = await AsyncStorage.getItem("ORGANISER_JWT_TOKEN");
        const userString = await AsyncStorage.getItem("user"); // Assuming user object is stored here like in Code 1
        const user = userString ? JSON.parse(userString) : null;
        const organizerId = user?.id;

        if (!token || !organizerId) {
          throw new Error("Authentication token or User ID not found. Please log in.");
        }

        // --- 2. Fetch Data from Backend API (Parallel Requests) ---
        // We use Promise.all to fetch events and registrations simultaneously
        const [eventsResponse, registrationsResponse] = await Promise.all([
          // Fetch Total Events
          axios.get(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 1, organizerId }
          }),
          // Fetch Total Registrations
          axios.get(`${API_URL}/registrations/total`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 1, organizerId }
          })
        ]);
        console.log(registrationsResponse.data);
        // --- 3. Extract Data ---
        // Extract total events from meta
        const eventsMeta = eventsResponse.data.meta || {};
        const totalEventsCount = eventsMeta.totalItems || 0;

        // Extract total registrations from count
        const totalRegistrationsCount = registrationsResponse.data.count || 0;

        // --- 4. Map to Frontend Structure ---
        // We maintain the { value, change } structure required by the UI
        const mappedStats = {
          totalEvents: {
            value: String(totalEventsCount),
            change: { amount: '0', type: 'increase' }
          },
          totalRegistrations: {
            value: String(totalRegistrationsCount),
            change: { amount: '0', type: 'increase' }
          },
          // Hardcoded to 0 as per Code 1 logic
          totalAttendance: {
            value: '0',
            change: { amount: '0', type: 'increase' }
          },
          // Hardcoded to 0 as per Code 1 logic
          averageRating: {
            value: '0',
            change: { amount: '0', type: 'increase' }
          },
        };

        // --- 5. Update State ---
        setData(prevData => ({
          ...prevData,
          stats: mappedStats,
        }));

      } catch (err) {
        console.error('Error fetching organizer dashboard stats:', err.response?.data || err.message);
        setError(err.message || "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return { ...data, loading, error };
};