// data/Admin/vanue.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAdminNotification } from '../Admin/adminDash';
// AsyncStorage.removeItem('admin_venues');
const ADMIN_VENUE_KEY = 'admin_venues';

// ✅ Sample data on first app launch
const SAMPLE_VENUES = [
  {
    id: 1,
    title: "Great Hall",
    location: "Ga-Rankuwa Campus, Building 20",
    image: "https://www.tut.ac.za/images/news/2024/Nov2024/Ga_Rankuwa%20Hall.jpg#joomlaImage://local-images/news/2024/Nov2024/Ga_Rankuwa%20Hall.jpg?width=550&height=367",
    mlCapacity: 150,
    price: "R5000",
    previewImages: [
      "https://www.tut.ac.za/images/news/2024/Nov2024/Ga_Rankuwa%20Hall.jpg#joomlaImage://local-images/news/2024/Nov2024/Ga_Rankuwa%20Hall.jpg?width=550&height=367",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80"
    ]
  },
  {
    id: 2,
    title: "Architecture Wing",
    location: "Pretoria, Building 11",
    image: "https://planeco.co.za/wp-content/uploads/10.-AUDITORIUM-FROM-SOUTH.jpg",
    mlCapacity: 120,
    price: "R3000",
    previewImages: [
      "https://planeco.co.za/wp-content/uploads/10.-AUDITORIUM-FROM-SOUTH.jpg",
      "https://images.unsplash.com/photo-1571624436279-b272aff752b5?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400&q=80"
    ]
  },
  {
    id: 3,
    title: "Library Center",
    location: "Emalahleni Campus, Building 12",
    image: "https://tutupdates.co.za/wp-content/uploads/2022/11/tn_DSC_0571.jpg",
    mlCapacity: 70,
    price: "R4000",
    previewImages: [
      "https://tutupdates.co.za/wp-content/uploads/2022/11/tn_DSC_0571.jpg",
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80"
    ]
  },
  {
    id: 4,
    title: "Innovation Lecture Hall",
    location: "Polokwane Campus, Building 5",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    mlCapacity: 92,
    price: "R4500",
    previewImages: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=400&q=80"
    ]
  },
  {
    id: 5,
    title: "Ruth First Hall",
    location: "Soshanguve Campus, Building 18",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Ruth_First_Hall_%28Soshanguve_South_Campus_TUT%29.jpg",
    mlCapacity: 110,
    price: "R5200",
    previewImages: [
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Ruth_First_Hall_%28Soshanguve_South_Campus_TUT%29.jpg",
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80"
    ]
  },
  {
    id: 6,
    title: "Sports Field",
    location: "Main Campus, Outdoor",
    image: "https://cdnx.elexxeaapp.com/resources/f6GmlDq1115175843vas08365vsudf4jb/20250416/9DPWjsMaEHMN1YIXoGsigN2WAGBAwFMtSghV.png",
    mlCapacity: 300,
    price: "R7000",
    previewImages: [
      "https://cdnx.elexxeaapp.com/resources/f6GmlDq1115175843vas08365vsudf4jb/20250416/9DPWjsMaEHMN1YIXoGsigN2WAGBAwFMtSghV.png",
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=400&q=80"
    ]
  }
  ,
  {
    id: 7,
    title: "Building 18 Hall",
    location: "Emalahleni Campus, Building 18",
    image: "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSyBa8kqphmgMSaXCflwQs25Z8v4DDjfFkU0dui8LjQQuvV8-cWYQOsxzP0dwceqABDXp6JIiTWgjBB_zvE_WRFApP6qPwqyHpr4CA8wruyPjj7YGbXwDzwCSRbXKkqrl_axMDWFPA=s680-w680-h510-rw",
    mlCapacity: 200,
    price: "R19000",
    previewImages: [
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSyBa8kqphmgMSaXCflwQs25Z8v4DDjfFkU0dui8LjQQuvV8-cWYQOsxzP0dwceqABDXp6JIiTWgjBB_zvE_WRFApP6qPwqyHpr4CA8wruyPjj7YGbXwDzwCSRbXKkqrl_axMDWFPA=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSwEmiAaUGEw3nd8ATtfGedR_JF-n0DZomJe61ZKMYxW0mnLc7f4r3v-oQa2jkbZedtA0Wby2uf29H2mWZbXP2GyyJlkHNHUWnYHeswteJ34FWlSACBsykUqcA65bYWlx9QYjJ-b8A=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzXzBBn5otABR0ae-QEFM9bF2goNKWq1g11dC7Vr_llyNyokqsMcEwyjd3McLU6y8teZU9_k89IFSpPeF5R1mRSjJSxaKT5W5ENHXeQh8ixvBE_40tI_HEU5cU5lYh3X4sJMjHJ=s680-w680-h510-rw"
    ]
  }
  ,
  {
    id: 8,
    title: "Sports Field",
    location: "Emalahleni Campus, Outdoor",
    image: "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSyIkvpQMHJHKkSk8RD0lRw1PnfVgmnd2kdtGpTHvphZhtT6rHEjy-ik8iAjD7JAMbzshJGjqkPpRsEc_N9i0rjPgTRwrA8rc8HbBrpUds7VWNT8zQ7753-gWci8iqZ0t-AIgoQTWw=s680-w680-h510-rw",
    mlCapacity: 300,
    price: "R10000",
    previewImages: [
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSyIkvpQMHJHKkSk8RD0lRw1PnfVgmnd2kdtGpTHvphZhtT6rHEjy-ik8iAjD7JAMbzshJGjqkPpRsEc_N9i0rjPgTRwrA8rc8HbBrpUds7VWNT8zQ7753-gWci8iqZ0t-AIgoQTWw=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzv8NVMJYTeDhGsUwoB5cjCw1YbcnmB6htjnWQUbZ4W-agrSkdJajZpQao2OrxIPTRWhLyg5lwoBsCA0m5bTvM2IhlyL_ppL-q6-1quPo8F3yZHWmZmpgDxzJdo9bOCJ9FFACNj=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSxJ1Cyl0pCphtUyZEn6NJk68cnQVqEG3yKa6fgsGAI0-jskQVdVaVYuFK7F3TZ9cKW98qEfetAk5_F9OxB12eXz50QKYr5Z9cNJGStyZFYNFEAvwndkSryMS-q4Dk8dbwnwh-uG=s680-w680-h510-rw"
    ]
  }
  ,
  {
    id: 9,
    title: "Auditorium",
    location: "Emalahleni Campus, Outdoor",
    image: "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSwOyBRyLBcT1cuYtKR_W0qecHT69VsjBVxtgF_Urn1f0hXkT2xCzZXcMwJBppqQI2ndpPF23v_fYRYmbR1LNVBftzXxrvpJiBLs7nT9TjcnOJfuDkhX-mRLrYXnKPlVsBavTite5g=s680-w680-h510-rw",
    mlCapacity: 200,
    price: "R1650",
    previewImages: [
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSwOyBRyLBcT1cuYtKR_W0qecHT69VsjBVxtgF_Urn1f0hXkT2xCzZXcMwJBppqQI2ndpPF23v_fYRYmbR1LNVBftzXxrvpJiBLs7nT9TjcnOJfuDkhX-mRLrYXnKPlVsBavTite5g=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzv8NVMJYTeDhGsUwoB5cjCw1YbcnmB6htjnWQUbZ4W-agrSkdJajZpQao2OrxIPTRWhLyg5lwoBsCA0m5bTvM2IhlyL_ppL-q6-1quPo8F3yZHWmZmpgDxzJdo9bOCJ9FFACNj=s680-w680-h510-rw",
      "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzBPBWNxW-g99qJyRvaKG9wtA9bV4wTVYI1Hy-ID_6O-it6nVKTUFGsJyJwYoFf_Hz_CW78f2ukxSF1leYTd1OxPQojx_NZQyeFeRNvYsRBlBKdINkJFmY8B7hBRXRg1PD_wBz8=s680-w680-h510-rw"
    ]
  }
];

// ✅ Get all venues
export const getVenues = async () => {
  try {
    const json = await AsyncStorage.getItem(ADMIN_VENUE_KEY);
    if (json) {
      return JSON.parse(json);
    } else {
      await AsyncStorage.setItem(ADMIN_VENUE_KEY, JSON.stringify(SAMPLE_VENUES));
      return SAMPLE_VENUES;
    }
  } catch (e) {
    console.error('❌ Failed to load venues:', e);
    return [];
  }
};

// ✅ Add one or more new venues
export const addVenues = async (newVenues) => {
  try {
    const existing = await getVenues();
    const updated = [...existing, ...newVenues];
    await AsyncStorage.setItem(ADMIN_VENUE_KEY, JSON.stringify(updated));

    console.log('✅ New venues added.');
    await addAdminNotification({
      title: 'New Venue Added',
      message: `${newVenues.length} new venue(s) added by admin.`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to add venue(s):', e);
    throw e;
  }
};

// ✅ Update existing venue (including images)
export const updateVenue = async (updatedVenue) => {
  try {
    const existing = await getVenues();
    const updated = existing.map((venue) =>
      venue.id === updatedVenue.id ? updatedVenue : venue
    );
    await AsyncStorage.setItem(ADMIN_VENUE_KEY, JSON.stringify(updated));

    console.log(`✅ Venue "${updatedVenue.name}" updated.`);
    await addAdminNotification({
      title: 'Venue Updated',
      message: `Admin updated venue "${updatedVenue.name}".`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to update venue:', e);
    throw e;
  }
};

// ✅ Delete a venue by ID
export const deleteVenue = async (id) => {
  try {
    const existing = await getVenues();
    const updated = existing.filter((venue) => venue.id !== id);
    await AsyncStorage.setItem(ADMIN_VENUE_KEY, JSON.stringify(updated));

    console.log(`✅ Venue with ID ${id} deleted.`);
    await addAdminNotification({
      title: 'Venue Deleted',
      message: `Admin deleted a venue (ID: ${id}).`,
    });

    return updated;
  } catch (e) {
    console.error('❌ Failed to delete venue:', e);
    throw e;
  }
};

// ✅ Clear all venues (optional)
export const clearVenues = async () => {
  try {
    await AsyncStorage.removeItem(ADMIN_VENUE_KEY);
    console.log('✅ All venues cleared.');
    return [];
  } catch (e) {
    console.error('❌ Failed to clear venues:', e);
    return [];
  }
};


