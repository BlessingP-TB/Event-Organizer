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
    resourceUtilized: { value: '0%', change: { amount: '0', type: 'increase' } },
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

        const token = await AsyncStorage.getItem("ORGANISER_JWT_TOKEN");
        if (!token) {
          const authError = new Error("Authentication token not found. Please log in.");
          authError.code = 'AUTH_TOKEN_MISSING';
          throw authError;
        }

        const requestConfig = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const [statsResponse, registrationsResponse] = await Promise.all([
          axios.get(`${API_URL}/organizer/stats/dashboard`, requestConfig),
          axios.get(`${API_URL}/registrations/total`, requestConfig)
        ]);

        const organizerStats = statsResponse.data || {};
        const totalEventsCount = Number(organizerStats.totalEvents || 0);
        const totalRegistrationsCount = Number(registrationsResponse.data?.count || 0);
        const totalAttendanceCount = Number(organizerStats.totalTicketsSold || 0);
        const upcomingEventsCount = Number(organizerStats.upcomingEvents || 0);
        const resourceUtilization = totalEventsCount > 0
          ? `${Math.round((upcomingEventsCount / totalEventsCount) * 100)}%`
          : '0%';

        const mappedStats = {
          totalEvents: {
            value: String(totalEventsCount),
            change: { amount: '0', type: 'increase' }
          },
          totalRegistrations: {
            value: String(totalRegistrationsCount),
            change: { amount: '0', type: 'increase' }
          },
          totalAttendance: {
            value: String(totalAttendanceCount),
            change: { amount: '0', type: 'increase' }
          },
          resourceUtilized: {
            value: resourceUtilization,
            change: { amount: '0', type: 'increase' }
          },
          averageRating: {
            value: '0',
            change: { amount: '0', type: 'increase' }
          },
        };

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