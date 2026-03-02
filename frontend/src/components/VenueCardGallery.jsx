// VenueCardGallery.jsx
import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { MdImage } from "react-icons/md";
import axios from "axios";
import "../styles/pages/_createEvent.scss";

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

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/venues");
      // Handle both array response and paginated response
      const venuesArray = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      setVenues(venuesArray);
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

  const filteredVenues = venues.filter((venue) => {
    const campusMatch =
      !campusFilter ||
      venue.location?.toLowerCase().includes(campusFilter.toLowerCase());
    const typeMatch =
      !venueTypeFilter ||
      venue.type?.toLowerCase().includes(venueTypeFilter.toLowerCase());
    const capacityMatch =
      !minCapacity || Number(venue.capacity) >= Number(minCapacity);
    return campusMatch && typeMatch && capacityMatch;
  });

  if (loading) return <p className="loading">Loading venues...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section className="form-section">
      <div className="section-header">
        <h2 className="section-title">Venue Selection</h2>
      </div>

      <div className="venue-card-grid">
        {filteredVenues.length === 0 ? (
          <p className="no-venues">No venues available that match your filters.</p>
        ) : (
          filteredVenues.map((venue) => (
            <div
              key={venue.id} // ✅ Use venue.id instead of index
              className={`venue-card ${selectedVenue?.id === venue.id ? "selected" : ""}`}
              onClick={() => {
                setSelectedVenue(venue);
                setFormData(prev => ({ ...prev, venueId: venue.id }));
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
          ))
        )}
      </div>
    </section>
  );
}