// data/Admin/adminDash.js
import AsyncStorage from '@react-native-async-storage/async-storage';
// AsyncStorage.removeItem('admin_dashboard_data');
// Keys for AsyncStorage
const DASHBOARD_KEY = 'admin_dashboard_data';

// --- Mock Data (Default) ---

const SAMPLE_DASHBOARD_DATA = {
  notifications: [

  ],

  occupancyData: [
    { name: 'Lecture', occupied: 80, total: 100 },
    { name: 'Sports', occupied: 80, total: 100 },
    { name: 'Library', occupied: 45, total: 100 },
    { name: 'Auditorium', occupied: 20, total: 100 },
    { name: 'Art', occupied: 50, total: 100 },
  ],

  revenueSummary: {
    amount: 'R27,000',
    change: '+10.20%',
    trend: 'vs. last month',
    graph: [1, 12, 10, 20, 60, 10, 50, 56, 20, 20, 30, 40, 60, 80, 100]
  },



  analyticsData: {
    totalRegisteredUsers: {
      value: "4"
    },
    activeEvents: {
      value: "0"
    },
    eventBookingsMonth: {
      value: "5"
    },
    resourceUtilization: {
      value: "0%"
    }
  },
};

// --- Functions ---

export const addAdminNotification = async (notification) => {
  try {
    // 1. Read current dashboard data from AsyncStorage
    const json = await AsyncStorage.getItem(DASHBOARD_KEY);
    const current = json ? JSON.parse(json) : SAMPLE_DASHBOARD_DATA;

    // 2. Create new notification
    const newNotification = {
      id: Date.now().toString(),
      title: notification.title || 'New Event Submission',
      message: notification.message || 'An organizer has submitted a new event for approval.',
      time: 'Just now',
      read: false,
    };

    // 3. Prepend to notifications list
    const updatedNotifications = [newNotification, ...(current.notifications || [])];

    // 4. Save updated dashboard back
    const updatedData = { ...current, notifications: updatedNotifications };
    await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(updatedData));

    console.log('✅ Admin notification added:', newNotification);
  } catch (error) {
    console.error('❌ Failed to add admin notification:', error);
    throw error; // re-throw to allow caller to handle
  }
};

export const saveDashboardData = async (newData) => {
  try {
    await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(newData));
  } catch (e) {
    console.error('❌ Failed to save dashboard data:', e);
    throw e;
  }
};

export const getDashboardData = async () => {
  try {
    const json = await AsyncStorage.getItem(DASHBOARD_KEY);
    if (json) {
      return JSON.parse(json);
    } else {
      await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(SAMPLE_DASHBOARD_DATA));
      return SAMPLE_DASHBOARD_DATA;
    }
  } catch (e) {
    console.error('❌ Failed to load dashboard data:', e);
    return SAMPLE_DASHBOARD_DATA;
  }
};

export const resetDashboardData = async () => {
  try {
    await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(SAMPLE_DASHBOARD_DATA));
    return SAMPLE_DASHBOARD_DATA;
  } catch (e) {
    console.error('❌ Failed to reset dashboard data:', e);
    throw e;
  }
};

