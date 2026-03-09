// data/Admin/calendar.js
/*import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAdminNotification } from '../Admin/adminDash';
//  AsyncStorage.removeItem('admin_available_dates');
const ADMIN_DATES_KEY = 'admin_available_dates';

// ✅ Sample initial data (safe ISO format)
const SAMPLE_DATES = [
  {
    date: "2025-11-10", // ← No time, no 'T', no 'Z'
    venueIds: [1, 3],
    startTime: "09:00",
    endTime: "17:00"
  },
  {
    date: "2025-11-11",
    venueIds: [2],
    startTime: "10:00",
    endTime: "14:00"
  }
];

// ✅ Helper function to normalize date format
const toDateKey = (dateString) => {
  if (!dateString) return null;
  if (dateString.includes('T')) {
    return dateString.split('T')[0]; // "2025-11-12T00:00:00Z" → "2025-11-12"
  }
  // Assume it's already YYYY-MM-DD
  return dateString;
};

// ✅ Get all available dates
export const getAvailableDates = async () => {
  try {
    const json = await AsyncStorage.getItem(ADMIN_DATES_KEY);
    if (json) {
      const parsed = JSON.parse(json);

      // Normalize any outdated or non-ISO stored dates
      const normalized = parsed.map(d => ({
        ...d,
        date: toDateKey(d.date)
      }));

      return normalized;
    } else {
      // First-time launch → save sample dates
      await AsyncStorage.setItem(ADMIN_DATES_KEY, JSON.stringify(SAMPLE_DATES));
      return SAMPLE_DATES;
    }
  } catch (e) {
    console.error('❌ Failed to load available dates:', e);
    return [];
  }
};

// ✅ Add new available date(s)
export const addAvailableDates = async (newDates) => {
  try {
    const existing = await getAvailableDates();

    // Normalize new entries before saving
    const normalizedNew = newDates.map(d => ({
      ...d,
      date: toDateKey(d.date)
    }));

    const updated = [...existing, ...normalizedNew];
    await AsyncStorage.setItem(ADMIN_DATES_KEY, JSON.stringify(updated));

    console.log('✅ New available dates added.');

    await addAdminNotification({
      title: 'New Dates Added',
      message: `${normalizedNew.length} new available date(s) added by admin.`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to add available dates:', e);
    throw e;
  }
};

// ✅ Update an existing date's time
export const updateAvailableDate = async (dateToUpdate) => {
  try {
    const existing = await getAvailableDates();

    // Normalize updated date before comparison/saving
    const normalizedUpdate = {
      ...dateToUpdate,
      date: toDateKey(dateToUpdate.date)
    };

    const updated = existing.map(d =>
      d.date === normalizedUpdate.date ? normalizedUpdate : d
    );

    await AsyncStorage.setItem(ADMIN_DATES_KEY, JSON.stringify(updated));

    console.log(`✅ Date ${normalizedUpdate.date} updated.`);

    await addAdminNotification({
      title: 'Date Updated',
      message: `Admin updated available date ${normalizedUpdate.date}.`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to update available date:', e);
    throw e;
  }
};

// ✅ Delete a specific date
export const deleteAvailableDate = async (dateToDelete) => {
  try {
    const existing = await getAvailableDates();

    // Normalize deletion target
    const normalizedDelete = toDateKey(dateToDelete);

    const updated = existing.filter(d => d.date !== normalizedDelete);
    await AsyncStorage.setItem(ADMIN_DATES_KEY, JSON.stringify(updated));

    console.log(`✅ Date ${normalizedDelete} deleted.`);

    await addAdminNotification({
      title: 'Date Deleted',
      message: `Admin deleted available date ${normalizedDelete}.`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to delete available date:', e);
    throw e;
  }
};

// ✅ Clear all available dates (optional)
export const clearAvailableDates = async () => {
  try {
    await AsyncStorage.removeItem(ADMIN_DATES_KEY);
    console.log('✅ All available dates cleared.');
    return [];
  } catch (e) {
    console.error('❌ Failed to clear available dates:', e);
    return [];
  }
};*/
// app/data/Admin/calender.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const CALENDAR_STORAGE_KEY = 'available_dates';

// Helper function to save the full list back to storage
const _saveDates = async (dates) => {
  try {
    const jsonValue = JSON.stringify(dates);
    await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, jsonValue);
    return dates; // Return the saved dates
  } catch (e) {
    console.error("Failed to save calendar dates:", e);
    Alert.alert("Error", "Failed to save calendar data to storage.");
    return dates; // Return the (unsaved) dates
  }
};

// --- Exported Functions ---

// Gets all dates from storage
export const getAvailableDates = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Failed to load calendar dates:", e);
    return [];
  }
};

// Adds new dates (or updates duplicates)
export const addAvailableDates = async (newDates) => {
  const currentDates = await getAvailableDates();

  newDates.forEach(newDate => {
    const index = currentDates.findIndex(d => d.date === newDate.date);
    if (index > -1) {
      currentDates[index] = newDate; // Update existing
    } else {
      currentDates.push(newDate); // Add new
    }
  });

  return await _saveDates(currentDates);
};

// Updates a single date object
export const updateAvailableDate = async (updatedDate) => {
  const currentDates = await getAvailableDates();
  const index = currentDates.findIndex(d => d.date === updatedDate.date);

  if (index > -1) {
    currentDates[index] = updatedDate;
    return await _saveDates(currentDates);
  } else {
    // If not found, just add it
    return await addAvailableDates([updatedDate]);
  }
};

// Deletes a date by its date string
export const deleteAvailableDate = async (dateString) => {
  const currentDates = await getAvailableDates();
  const filteredDates = currentDates.filter(d => d.date !== dateString);
  return await _saveDates(filteredDates);
};

// Clears all dates from storage
export const clearAvailableDates = async () => {
  try {
    await AsyncStorage.removeItem(CALENDAR_STORAGE_KEY);
    return []; // Return an empty array
  } catch (e) {
    console.error("Failed to clear calendar dates:", e);
    return [];
  }
};

