// hooks/useEvents.js

import { useEffect, useState } from 'react';
import { getAttendeeEvents } from '../../data/Organiser/myEvents';

// 🔵 MAP BACKEND STATUS → FRONTEND STATUS
const mapEventStatus = (event) => {
  const now = new Date();
  // Ensure we have a valid Date object for comparison
  const eventStartTime = event.startDateTime ? new Date(event.startDateTime) : null;

  // --- FIX APPLIED HERE ---
  // Handle internal statuses like 'PUBLISHED' or 'PENDING'
  if (event.status && typeof event.status === 'string') {
    const normalizedStatus = event.status.toUpperCase();

    if (normalizedStatus === "PUBLISHED") {
      // If Published and date is in the future, it's Upcoming.
      if (eventStartTime && eventStartTime > now) {
        return "Upcoming";
      }
      // If Published and date is in the past, it's Missed (if not Completed).
      return "Missed";
    }

    if (normalizedStatus === "COMPLETED") {
      return "Attended";
    }

    // Handle the 'Past' status from sample data or other unmapped statuses that should be 'Missed'
    if (normalizedStatus === "PAST" || (eventStartTime && eventStartTime <= now && normalizedStatus !== "ATTENDED")) {
      return "Missed";
    }
  }

  // Fallback for any other unhandled status
  return event.status;
};

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const attendeeEvents = await getAttendeeEvents();

        // Apply status mapping
        const mappedEvents = attendeeEvents.map((event) => ({
          ...event,
          // Use the date information from myEvents.js mapping
          date: event.displayDate,
          status: mapEventStatus(event),
        }));

        setEvents(mappedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadEvents();
  }, []);

  const getEventById = (id) => {
    return events.find(event => event.id === id);
  };

  return {
    events,
    isLoaded,
    getEventById,
  };
};