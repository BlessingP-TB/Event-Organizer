// hooks/Admin/useCalendar.js
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  addAvailableDates,
  clearAvailableDates,
  deleteAvailableDate,
  getAvailableDates,
  updateAvailableDate,
} from '../../data/Admin/calendarApi';

export const useAdminCalendar = () => {
  const [availableDates, setAvailableDates] = useState([]);

  const loadDates = async () => {
    const dates = await getAvailableDates();
    setAvailableDates(dates);
  };

  // Load on first mount
  useEffect(() => {
    loadDates();
  }, []);

  // Reload every time screen refocuses
  useFocusEffect(
    useCallback(() => {
      loadDates();
    }, [])
  );

  // Add new date(s)
  const addDates = async (newDates) => {
    const updated = await addAvailableDates(newDates);
    setAvailableDates(updated);
  };

  // Update a single date
  const updateDate = async (dateObj) => {
    const updated = await updateAvailableDate(dateObj);
    setAvailableDates(updated);
  };

  // Delete a single date
  const deleteDate = async (date) => {
    const updated = await deleteAvailableDate(date);
    setAvailableDates(updated);
  };

  // Clear all dates
  const clearAllDates = async () => {
    const cleared = await clearAvailableDates();
    setAvailableDates(cleared);
  };

  return {
    availableDates,
    addDates,
    updateDate,
    deleteDate,
    clearAllDates,
    reload: loadDates,
  };
};
