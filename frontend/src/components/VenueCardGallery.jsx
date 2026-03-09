// VenueCardGallery.jsx
import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { MdImage } from "react-icons/md";
import api from "../utils/api";
import "../styles/pages/_createEvent.scss";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/i, '');

const resolveVenueImageUrl = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  let normalized = value.replace('/api/v1/uploads/', '/uploads/');

  if (normalized.startsWith('/uploads/')) {
    normalized = `${BACKEND_ORIGIN}${normalized}`;
  }

  return encodeURI(normalized);
};

const normalizeImageUrls = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((url) => resolveVenueImageUrl(url)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((url) => resolveVenueImageUrl(url)).filter(Boolean);
      }
      if (typeof parsed === "string") {
        return [resolveVenueImageUrl(parsed.trim())].filter(Boolean);
      }
    } catch {
      // not JSON - treat as plain URL string
    }

    return [resolveVenueImageUrl(trimmed)].filter(Boolean);
  }

  return [];
};

export default function VenueCardGallery({
  selectedVenue,
  setSelectedVenue,
  setFormData,
  campusFilter = "",
  venueTypeFilter = "",
  minCapacity = 0,
}) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const resolveVenueId = (venue) => venue?.id || venue?.venueId || venue?._id || '';

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/venues");
      const payload = response?.data;
      const candidates = [
        payload,
        payload?.data,
        payload?.items,
        payload?.results,
        payload?.data?.data,
        payload?.data?.items,
        payload?.results?.data,
      ];
      const venuesArray = candidates.find(Array.isArray) || [];
      setVenues(
        venuesArray.map((venue) => ({
          ...venue,
          imageUrls: normalizeImageUrls(venue.imageUrls),
        }))
      );
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch venues:", err);
      setError("Failed to load venues. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const normalizedCampusFilter = String(campusFilter || "").trim();
  const normalizedVenueTypeFilter = String(venueTypeFilter || "").trim();
  const normalizedMinCapacity = Number(minCapacity);

  const hasCampusFilter = normalizedCampusFilter.length > 0;
  const hasVenueTypeFilter = normalizedVenueTypeFilter.length > 0;
  const hasCapacityFilter =
    Number.isFinite(normalizedMinCapacity) && normalizedMinCapacity > 0;

  const filteredVenues = venues.filter((venue) => {
    const venueCampusLocation = `${venue.campus || ""} ${venue.location || ""}`.toLowerCase();
    const venueType = String(venue.type || "").toLowerCase();

    const campusMatch =
      !hasCampusFilter ||
      venueCampusLocation.includes(normalizedCampusFilter.toLowerCase());
    const typeMatch =
      !hasVenueTypeFilter ||
      venueType.includes(normalizedVenueTypeFilter.toLowerCase());
    const capacityMatch =
      !hasCapacityFilter || Number(venue.capacity) >= normalizedMinCapacity;
    return campusMatch && typeMatch && capacityMatch;
  });

  const isFilterActive = hasCampusFilter || hasVenueTypeFilter || hasCapacityFilter;

  if (loading) return <p className="loading">Loading venues...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section className="form-section">
      <div className="section-header">
        <h2 className="section-title">Venue Selection</h2>
      </div>

      {/* venue select removed - users pick via cards */}

      <div className="venue-card-grid">
        {filteredVenues.length === 0 ? (
          <p className="no-venues">
            {isFilterActive
              ? "No venues available that match your filters."
              : "No venues available right now."}
          </p>
        ) : (
          filteredVenues.map((venue) => {
            const venueId = resolveVenueId(venue);
            return (
            <div
              key={venueId || venue.name}
              className={`venue-card ${selectedVenueId === venueId ? "selected" : ""}`}
              onClick={() => {
                setSelectedVenue(venue);
                if (typeof setFormData === "function") {
                  setFormData(prev => ({ ...prev, venueId: venue.id }));
                }
              }}
            >
              {/* Venue Image */}
              <div className="venue-image">
                {venue.imageUrls && venue.imageUrls.length > 0 ? ( // ✅ Fixed: imageUrls
                  <img 
                    src={venue.imageUrls[0]} 
                    alt={venue.name} 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="image-placeholder">
                    <MdImage size={40} color="#0077B6" />
                    <p>No image</p>
                  </div>
                )}
              </div>

              {/* Venue Info */}
              <div className="venue-info">
                <h3 className="venue-name">{venue.name}</h3>
                <p className="venue-location">
                  <MapPin size={14} /> {venue.location || "Unknown location"}
                </p>
                <p className="venue-type">Type: {venue.type || "—"}</p>
                <p className="venue-price">R{venue.price || "—"}</p>
                <p className="venue-capacity">Capacity: {venue.capacity || "—"}</p>
              </div>
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}