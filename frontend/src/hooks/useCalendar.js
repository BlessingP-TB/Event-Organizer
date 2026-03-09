import { useState, useEffect } from "react";
import {
  getAvailableDates,
  addAvailableDates,
  deleteAvailableDate,
  getApprovedEvents
} from "../data/calendar";

export const useAdminCalendar = () => {
  const [availableDates, setAvailableDates] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);

  useEffect(() => {
    setAvailableDates(getAvailableDates());
    setApprovedEvents(getApprovedEvents());
  }, []);

  const addDates = (newDates) => {
    const updated = addAvailableDates(newDates);
    setAvailableDates(updated);
  };

  const deleteDate = (date, startTime, endTime) => {
    const updated = deleteAvailableDate(date, startTime, endTime);
    setAvailableDates(updated);
  };

  return { availableDates, approvedEvents, addDates, deleteDate };
};
