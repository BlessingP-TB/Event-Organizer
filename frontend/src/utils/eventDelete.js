import api from './api';

export async function deleteEvent(eventId) {
  try {
    await api.delete(`/events/${eventId}`);
  } catch (error) {
    throw error;
  }
}
