// hooks/organiser/useOrgaDash.js
import API_URL from '@/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

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

  const fetchDashboardStats = useCallback(async () => {
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

      const [statsResponse, registrationsResponse, notificationsResponse] = await Promise.all([
        axios.get(`${API_URL}/organizer/stats/dashboard`, requestConfig),
        axios.get(`${API_URL}/registrations/total`, requestConfig),
        axios.get(`${API_URL}/notifications`, requestConfig),
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

      const notificationsRaw = Array.isArray(notificationsResponse.data)
        ? notificationsResponse.data
        : [];

      const mappedNotifications = notificationsRaw.map((item) => ({
        id: item.id,
        title: item.title || 'Notification',
        message: item.message || '',
        read: Boolean(item.read),
        createdAt: item.createdAt,
        time: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now',
      }));

      setData((prevData) => ({
        ...prevData,
        stats: mappedStats,
        notifications: mappedNotifications,
      }));

    } catch (err) {
      console.error('Error fetching organizer dashboard stats:', err.response?.data || err.message);
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
    }, [fetchDashboardStats])
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("ORGANISER_JWT_TOKEN");
      if (!token) return;

      const unread = (data.notifications || []).filter((item) => !item.read);
      if (!unread.length) return;

      const requestConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };

      await Promise.all(
        unread.map((item) =>
          axios.patch(`${API_URL}/notifications/${item.id}`, { read: true }, requestConfig)
        )
      );

      setData((prev) => ({
        ...prev,
        notifications: (prev.notifications || []).map((item) => ({ ...item, read: true })),
      }));
    } catch (err) {
      console.error('Failed to mark organizer notifications as read:', err?.response?.data || err?.message || err);
    }
  }, [data.notifications]);

  return {
    ...data,
    loading,
    error,
    reload: fetchDashboardStats,
    markAllNotificationsAsRead,
  };
};