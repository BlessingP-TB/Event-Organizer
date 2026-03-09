// src/hooks/Admin/venue.js

const IMAGE_STORAGE_KEY = "venueImages";

/**
 * Save images for a specific venue ID
 * @param {string} venueId 
 * @param {string[]} images 
 */
export const saveVenueImages = (venueId, images) => {
  const stored = JSON.parse(localStorage.getItem(IMAGE_STORAGE_KEY)) || {};
  stored[venueId] = images;
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(stored));
};

/**
 * Get images for a specific venue ID
 * @param {string} venueId 
 * @returns {string[]} images
 */
export const getVenueImages = (venueId) => {
  const stored = JSON.parse(localStorage.getItem(IMAGE_STORAGE_KEY)) || {};
  return stored[venueId] || [];
};

/**
 * Remove images for a specific venue ID
 * @param {string} venueId 
 */
export const removeVenueImages = (venueId) => {
  const stored = JSON.parse(localStorage.getItem(IMAGE_STORAGE_KEY)) || {};
  if (stored[venueId]) {
    delete stored[venueId];
    localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(stored));
  }
};

/**
 * Clear all venue images from storage
 */
export const clearAllVenueImages = () => {
  localStorage.removeItem(IMAGE_STORAGE_KEY);
};
