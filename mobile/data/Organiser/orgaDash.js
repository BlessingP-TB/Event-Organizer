// data/orgaDashData.js
export const orgaDashData = {
  stats: {
    totalEvents: {
      value: "5",
      change: { amount: "0", type: "increase" }, // "increase" or "decrease"
    },
    totalAttendance: {
      value: "5",
      change: { amount: "0", type: "increase" },
    },
    resourceUtilized: {
      value: "0%",
      change: { amount: "0", type: "decrease" },
    },
    averageRating: {
      value: "0",
      change: { amount: "0", type: "increase" },
    },
  },
  notifications: [
    { id: '1', title: 'Event Approved', message: 'Your event "Career Day" has been approved.', time: '2 min ago' },
    { id: '2', title: 'New RSVP', message: 'John Doe registered for your event.', time: '1 hour ago' },
    { id: '3', title: 'Resource Request', message: 'Pending approval for projector booking.', time: '3 hours ago' },
    // Add more if needed
  ],
};