// hooks/useAdminDashboard.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '@/config';

const DASHBOARD_STORAGE_KEY = 'admin_dashboard_data';

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

export const useAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Define loadDashboard in the hook's scope (not inside useEffect)
  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const config = await getAdminAuthHeaders();

      // Fetch dashboard stats from backend
      const dashboardResponse = await axios.get(`${API_URL}/admin/dashboard`, config);
      const dashboardStats = dashboardResponse.data.data;

      // Fetch top booked venues
      const topVenuesResponse = await axios.get(`${API_URL}/admin/venues/top-booked`, config);
      const topVenues = topVenuesResponse.data.data;

      // Fetch revenue data
      const revenueResponse = await axios.get(`${API_URL}/admin/analytics/revenue`, config);
      const revenueData = revenueResponse.data.data;

      // Combine data
      const combinedData = {
        ...dashboardStats,
        occupancyData: topVenues.map(venue => ({
          name: venue.name,
          occupied: venue.bookedCount,
          total: venue.capacity
        })),
        revenueSummary: {
          amount: `R${dashboardStats.currentMonthRevenue}`,
          change: `${dashboardStats.revenueChangePercent}%`,
          trend: 'vs. last month',
          graph: revenueData
        },
        analyticsData: {
          totalRegisteredUsers: {
            value: dashboardStats.registeredUsers.toString()
          },
          activeEvents: {
            value: dashboardStats.activeEvents.toString()
          },
          eventBookingsMonth: {
            value: dashboardStats.eventBookings.toString()
          },
          totalVenues: {
            value: dashboardStats.totalVenues.toString()
          }
        },
        notifications: [] // Keep notifications local for now
      };

      setDashboard(combinedData);
      // Optionally save to AsyncStorage for offline access
      await AsyncStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(combinedData));
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error);
      // Fallback to AsyncStorage if API fails
      try {
        const json = await AsyncStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (json) {
          setDashboard(JSON.parse(json));
        } else {
          // If no stored data, set default empty data to prevent flickering
          setDashboard({
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
          });
        }
      } catch (storageError) {
        console.error('❌ Error loading from storage:', storageError);
        // Set default empty data
        setDashboard({
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
        });
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
  const updateDashboard = async (newData) => {
    try {
      const updated = { ...dashboard, ...newData };
      setDashboard(updated);
      await AsyncStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('❌ Error updating dashboard data:', error);
    }
  };

  // ✅ Now reload can use loadDashboard
  const reload = useCallback(() => {
    setIsLoaded(false); // Optional: show loading state
    loadDashboard();
  }, [loadDashboard]);

  // --- Reset to sample data ---
  const restoreDefaults = async () => {
    try {
      // This would need to be updated if we want to reset to API data
      const data = await getDashboardData();
      setDashboard(data);
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

  const markAllNotificationsAsRead = async () => {
    if (!dashboard?.notifications) return;

    const updatedNotifications = dashboard.notifications.map(n => ({ ...n, read: true }));
    await updateDashboard({ notifications: updatedNotifications });
  };

  return {
    dashboard,
    isLoaded,
    reload, // ✅ Now properly defined
    restoreDefaults,
    markAllNotificationsAsRead,
    error
  };
};
