// src/hooks/Admin/adminDashboard.js
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const useAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    registeredUsers: 0,
    activeEvents: 0,
    eventBookings: 0,
    totalVenues: 0,
    currentMonthRevenue: 0,
    revenueChangePercent: '0.00',
    topVenues: [],
    revenueData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Use ref instead of state to persist across mounts
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false); // Track if currently fetching

  const getToken = () => localStorage.getItem('accessToken');

  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Fetch functions - return data instead of setting state directly
  const fetchDashboardData = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      const response = await axios.get('http://localhost:3000/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });

      return response.data;
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      handleAuthError(err);
      throw err;
    }
  };

  const fetchTopVenues = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      const response = await axios.get('http://localhost:3000/admin/venues/top-booked', {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });

      return response.data || [];
    } catch (err) {
      console.error('Error fetching top venues:', err);
      handleAuthError(err);
      throw err;
    }
  };

  const fetchRevenueData = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      const response = await axios.get('http://localhost:3000/admin/analytics/revenue', {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });

      return response.data || [];
    } catch (err) {
      console.error('Error fetching revenue ', err);
      handleAuthError(err);
      throw err;
    }
  };

  // Main fetch function - only runs once
  const fetchAllStats = async () => {
    // Use ref to check if already fetched or currently fetching
    if (hasFetchedRef.current || isFetchingRef.current) {
      console.log('Already fetched or fetching, skipping');
      return;
    }

    console.log('Starting fetchAllStats...');
    setLoading(true);
    setError('');
    isFetchingRef.current = true; // Mark as fetching
    hasFetchedRef.current = true; // Mark as fetched to prevent future calls

    try {
      // Fetch all data in parallel
      const [dashboard, topVenues, revenueData] = await Promise.all([
        fetchDashboardData(),
        fetchTopVenues(),
        fetchRevenueData()
      ]);

      // Set all data in a single state update
      setDashboardData(prev => ({
        ...prev,
        ...dashboard,
        topVenues,
        revenueData
      }));

      console.log('fetchAllStats completed successfully');
    } catch (err) {
      setError(err.message || 'Failed to fetch all dashboard statistics.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false; // Mark as not fetching
    }
  };

  // Only run once when component mounts
  useEffect(() => {
    fetchAllStats();
  }, []); // Empty dependency array - runs only once

  return {
    dashboardData,
    loading,
    error,
  };
};

export default useAdminDashboard;