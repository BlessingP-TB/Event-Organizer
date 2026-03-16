// hooks/useAdminDashboard.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '@/config';

const DASHBOARD_STORAGE_KEY = 'admin_dashboard_data';
const DEFAULT_DASHBOARD = {
  notifications: [],
  occupancyData: [],
  revenueSummary: {
    amount: 'R0',
    change: '+0%',
    trend: 'vs. last month',
    graph: [0, 0, 0, 0, 0]
  },
  analyticsData: {
    totalRegisteredUsers: { value: '0' },
    activeEvents: { value: '0' },
    eventBookingsMonth: { value: '0' },
    totalVenues: { value: '0' }
  }
};

const unwrapPayload = (response, fallback) => {
  const payload = response?.data?.data ?? response?.data;
  return payload ?? fallback;
};

// --- Utility function to get the token and config ---
const getAdminAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("ADMIN_JWT_TOKEN");

    if (!token) {
        const error = new Error("ADMIN_JWT_TOKEN_MISSING");
        error.code = 'AUTH_TOKEN_MISSING';
        throw error;
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const useAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Define loadDashboard in the hook's scope (not inside useEffect)
  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const config = await getAdminAuthHeaders();

      const [dashboardResponse, notificationsResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard`, config),
        axios.get(`${API_URL}/notifications`, config),
      ]);
      const dashboardStats = unwrapPayload(dashboardResponse, {});
      const topVenues = Array.isArray(dashboardStats.topVenues) ? dashboardStats.topVenues : [];
      const revenueData = Array.isArray(dashboardStats.revenueData) ? dashboardStats.revenueData : [];
      const notificationsFromApi = Array.isArray(notificationsResponse?.data)
        ? notificationsResponse.data.map((item) => ({
            id: item.id,
            title: item.title || 'Notification',
            message: item.message || '',
            read: Boolean(item.read),
            createdAt: item.createdAt,
            time: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now',
          }))
        : [];

      const combinedData = {
        ...DEFAULT_DASHBOARD,
        ...dashboardStats,
        occupancyData: topVenues.map(venue => ({
          name: venue.name,
          occupied: venue.bookedCount,
          total: venue.capacity
        })),
        revenueSummary: {
          amount: `R${Number(dashboardStats.currentMonthRevenue || 0)}`,
          change: `${dashboardStats.revenueChangePercent || 0}%`,
          trend: 'vs. last month',
          graph: revenueData
        },
        analyticsData: {
          totalRegisteredUsers: {
            value: String(dashboardStats.registeredUsers || 0)
          },
          activeEvents: {
            value: String(dashboardStats.activeEvents || 0)
          },
          eventBookingsMonth: {
            value: String(dashboardStats.eventBookings || 0)
          },
          totalVenues: {
            value: String(dashboardStats.totalVenues || 0)
          }
        },
        notifications: notificationsFromApi.length
          ? notificationsFromApi
          : (dashboardStats.notifications || [])
      };

      setDashboard(combinedData);
      await AsyncStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(combinedData));
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error);
      try {
        const json = await AsyncStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (json) {
          setDashboard(JSON.parse(json));
        } else {
          setDashboard(DEFAULT_DASHBOARD);
        }
      } catch (storageError) {
        console.error('❌ Error loading from storage:', storageError);
        setDashboard(DEFAULT_DASHBOARD);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // --- Load data on mount ---
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // --- Update dashboard data ---
  const updateDashboard = useCallback(async (newData) => {
    try {
      const updated = { ...dashboard, ...newData };
      setDashboard(updated);
      await AsyncStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('❌ Error updating dashboard data:', error);
    }
  }, [dashboard]);

  // ✅ Now reload can use loadDashboard
  const reload = useCallback(() => {
    setIsLoaded(false); // Optional: show loading state
    loadDashboard();
  }, [loadDashboard]);

  // --- Reset to sample data ---
  const restoreDefaults = async () => {
    try {
      setDashboard(DEFAULT_DASHBOARD);
      await AsyncStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(DEFAULT_DASHBOARD));
      setIsLoaded(true);
    } catch (error) {
      console.error('❌ Error resetting dashboard data:', error);
    }
  };

  // --- Helper methods (optional) ---
  const addNotification = async (notification) => {
    const updatedNotifications = [notification, ...(dashboard?.notifications || [])];
    await updateDashboard({ notifications: updatedNotifications });
  };

  const deleteNotification = async (id) => {
    const updatedNotifications = dashboard?.notifications?.filter((n) => n.id !== id) || [];
    await updateDashboard({ notifications: updatedNotifications });
  };

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!dashboard?.notifications) return;

    const unread = dashboard.notifications.filter((item) => !item.read);
    if (!unread.length) return;

    try {
      const config = await getAdminAuthHeaders();
      await Promise.all(
        unread.map((item) => axios.patch(`${API_URL}/notifications/${item.id}`, { read: true }, config))
      );
    } catch (error) {
      console.error('❌ Error marking admin notifications read on server:', error?.response?.data || error?.message || error);
    }

    const updatedNotifications = dashboard.notifications.map((item) => ({ ...item, read: true }));
    await updateDashboard({ notifications: updatedNotifications });
  }, [dashboard?.notifications, updateDashboard]);

  return {
    dashboard,
    isLoaded,
    reload, // ✅ Now properly defined
    restoreDefaults,
    markAllNotificationsAsRead,
    error
  };
};
