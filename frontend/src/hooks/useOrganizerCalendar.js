// src/hooks/useOrganizerCalendar.js
import { useState, useEffect } from "react";

// Mock functions: replace with API/localStorage calls
const getAvailableDates = () => {
  // Admin sets these dates as available
  return [
    { date: "2025-11-15" },
    { date: "2025-11-20" },
    { date: "2025-11-25" },
  ];
};

const getApprovedEvents = () => {
  // Approved events by admin
  return [
    { date: "2025-11-10" },
    { date: "2025-11-12" },
  ];
};

export const useOrganizerCalendar = () => {
  const [availableDates, setAvailableDates] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);

  useEffect(() => {
    setAvailableDates(getAvailableDates());
    setApprovedEvents(getApprovedEvents());
  }, []);

  const isDateFullyBooked = (date) => {
    const key = date.toISOString().split("T")[0];
    return approvedEvents.some(e => e.date === key);
  };

  const isDateAvailable = (date) => {
    const key = date.toISOString().split("T")[0];
    return availableDates.some(d => d.date === key) && !isDateFullyBooked(date);
  };

  return { availableDates, approvedEvents, isDateFullyBooked, isDateAvailable };
};
