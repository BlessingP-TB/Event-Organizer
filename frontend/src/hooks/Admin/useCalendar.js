// src/hooks/Admin/useCalendar.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import { refreshToken } from '../../utils/auth';

const useAdminCalendar = () => {
  const [availableDates, setAvailableDates] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('accessToken');

  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  // Fetch venues
  const fetchVenues = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      const response = await axios.get('http://localhost:3000/venues', {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });

      setVenues(response.data.data || []);
    } catch (err) {
      console.error('Error fetching venues:', err);
      setError(err.message || 'Failed to fetch venues.');
      handleAuthError(err);
    }
  };

  // Fetch calendar and bookings data
  const fetchCalendarData = async () => {
    setLoading(true);
    setError('');

    const requestFn = async (token) => {
      return Promise.all([
        axios.get('http://localhost:3000/admin/calendars', {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
        }),
        axios.get('http://localhost:3000/bookings/bookings', {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
        }),
      ]);
    };

    const makeAuthenticatedRequest = async () => {
      let token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      let [availRes, bookingsRes] = await requestFn(token);

      // Refresh token on 304 or auth failure
      if (availRes.status === 304 || bookingsRes.status === 304) {
        try {
          // await refreshToken();
          token = getToken();
          if (!token) throw new Error('Token refresh failed.');
          [availRes, bookingsRes] = await requestFn(token);
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr);
          handleAuthError(refreshErr);
          throw refreshErr;
        }
      }

      return [availRes, bookingsRes];
    };

    try {
      const [availRes, bookingsRes] = await makeAuthenticatedRequest();

      // Process available dates
      setAvailableDates(
        (availRes.data.data || []).map(d => ({
          id: d.id,
          date: new Date(d.date).toISOString().split('T')[0],
          startTime: d.startTime,
          endTime: d.endTime,
          venueIds: d.venueIds || [],
        }))
      );

      // Process bookings/events
      const processedBookings = (bookingsRes.data.data || []).map(b => {
        // Check if b.event exists before accessing its properties
        if (!b.event) return null;

        const eventDate = new Date(b.event.startDateTime);
        return {
          ...b,
          id: b.event.id,
          date: eventDate.toISOString().split('T')[0],
          title: b.event.name,
          time: `${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.event.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          location: b.venue?.name,
          startTime: eventDate.toTimeString().substring(0, 5),
          endTime: new Date(b.event.endDateTime).toTimeString().substring(0, 5),
        };
      }).filter(Boolean);

      setApprovedEvents(processedBookings);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError(err.message || 'Failed to fetch calendar data.');
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Add new slots
  const addDates = async (slots) => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      await Promise.all(
        slots.map(slot =>
          axios.post('http://localhost:3000/admin/calendars', slot, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      fetchCalendarData();
    } catch (err) {
      console.error('Failed to add slots:', err);
      setError(err.message || 'Failed to add slots.');
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Update existing slot
  const updateDate = async (slot) => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      // Validate required fields before sending request
      if (!slot.id) {
        throw new Error('Slot ID is required for update');
      }

      if (!slot.date || !slot.startTime || !slot.endTime) {
        throw new Error('Date, start time, and end time are required for update');
      }

      // Ensure venueIds is properly formatted
      const updatedSlot = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        venueIds: Array.isArray(slot.venueIds) ? [...slot.venueIds] : (slot.venueIds || [])
      };

      // Log the request to help with debugging
      console.log('Updating slot:', slot.id, updatedSlot);

      await axios.patch(`http://localhost:3000/admin/calendars/${slot.id}`, updatedSlot, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      fetchCalendarData(); // Refresh data after update
    } catch (err) {
      console.error('Failed to update slot:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err.message || 'Failed to update slot.');
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete a slot
  const deleteDate = async (date, startTime, endTime) => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing.');

      const slot = availableDates.find(d => d.date === date && d.startTime === startTime && d.endTime === endTime);
      if (!slot) {
        console.warn('Slot not found for deletion:', { date, startTime, endTime });
        return;
      }

      await axios.delete(`http://localhost:3000/admin/calendars/${slot.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchCalendarData();
    } catch (err) {
      console.error('Failed to delete slot:', err);
      setError(err.message || 'Failed to delete slot.');
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    fetchCalendarData();
    fetchVenues();
  };

  useEffect(() => {
    fetchCalendarData();
    fetchVenues();
  }, []);

  return {
    availableDates,
    approvedEvents,
    venues,
    loading,
    error,
    fetchCalendarData,
    addDates,
    updateDate,
    deleteDate,
    reload,
  };
};

export default useAdminCalendar;