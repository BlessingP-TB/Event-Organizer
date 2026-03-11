import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  deleteEvent,
  // Ensure this function exists in your data layer and fetches a single event by ID
  getEventById as fetchEventById,
  getOrganiserEvents,
  updateEvent
} from '../../data/Organiser/myEvents';

export const useEvents = () => {
  const [events, setEvents] = useState([]);

  const loadEvents = async () => {
    try {
      // This function must call your API endpoint (e.g., /event/organizer)
      const loaded = await getOrganiserEvents();
      setEvents(loaded);
    } catch (error) {
      console.error("Failed to load organizer events:", error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const getEventById = async (id) => {
    try {
        // 1. Check local cache first
        const cachedEvent = events.find(
          (event) =>
            event.id === parseInt(id) ||
            String(event.id) === String(id)
        );
        if (cachedEvent) return cachedEvent;

        // 2. Fetch directly from the server
        return await fetchEventById(id);
    } catch (error) {
        console.error("Error fetching event by ID:", error);
        return null;
    }
  };

  const approvedEvents = events.filter(
    (event) => event.approval === 'Approved'
  );

  return { events, getEventById, approvedEvents, deleteEvent, reload: loadEvents, updateEvent };
};