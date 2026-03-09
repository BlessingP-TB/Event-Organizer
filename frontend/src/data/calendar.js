// src/data/Admin/calendar.js
const ADMIN_AVAILABLE_KEY = "admin_available_dates";
const ADMIN_APPROVED_KEY = "admin_approved_events";

const SAMPLE_DATES = [
  { date: "2025-11-10", venueIds: [1, 3], startTime: "09:00", endTime: "17:00" },
  { date: "2025-11-11", venueIds: [2], startTime: "10:00", endTime: "14:00" },
];

const toDateKey = (dateString) => dateString.includes("T") ? dateString.split("T")[0] : dateString;

// ---------------- Available Dates ----------------
export const getAvailableDates = () => {
  const data = localStorage.getItem(ADMIN_AVAILABLE_KEY);
  if (!data) {
    localStorage.setItem(ADMIN_AVAILABLE_KEY, JSON.stringify(SAMPLE_DATES));
    return SAMPLE_DATES;
  }
  return JSON.parse(data).map(d => ({ ...d, date: toDateKey(d.date) }));
};

export const addAvailableDates = (newDates) => {
  const existing = getAvailableDates();
  const updated = [...existing, ...newDates.map(d => ({ ...d, date: toDateKey(d.date) }))];
  localStorage.setItem(ADMIN_AVAILABLE_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteAvailableDate = (date, startTime, endTime) => {
  const existing = getAvailableDates();
  const updated = existing.filter(
    d => !(d.date === toDateKey(date) && d.startTime === startTime && d.endTime === endTime)
  );
  localStorage.setItem(ADMIN_AVAILABLE_KEY, JSON.stringify(updated));
  return updated;
};

// ---------------- Approved Events ----------------
export const getApprovedEvents = () => {
  const data = localStorage.getItem(ADMIN_APPROVED_KEY);
  return data ? JSON.parse(data) : [];
};

export const addApprovedEvent = (event) => {
  const events = getApprovedEvents();
  events.push(event); // { id, title, date, startTime, endTime, venueIds }
  localStorage.setItem(ADMIN_APPROVED_KEY, JSON.stringify(events));
  return events;
};
