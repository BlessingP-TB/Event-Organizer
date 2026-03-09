// src/pages/AttendeeDashBoard/EventDetails.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Users, Building, Tag, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast'; // Import toast
import api from '../../utils/api'; // Import the centralized API utility
import '../../styles/pages/ViewEventDetails.scss'; // Assuming you keep this name
// import '../../styles/pages/_vieweventdetails.scss'; // Assuming you keep this name
import fallbackImage from '../../assets/images/eventPic.PNG';

// Helper to format date/time
const formatDateTime = (start, end) => {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  const startStr = startDate.toLocaleString(undefined, options);
  const endStr = endDate ? endDate.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  return endStr ? `${startStr} - ${endStr}` : startStr;
};

const EventDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  // Prefer fetching data over using stateEvent from location.state for freshest data
  const stateEvent = location.state?.eventData;

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEventDetails = useCallback(async () => {
    if (!id) {
      setError('Event ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/events/${id}`);
      setEventData(response.data);
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError('Failed to load event details.');
      // toast.error is handled by api.js interceptor
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // If stateEvent is passed, use it initially to show content faster, then fetch fresh data
    if (stateEvent && stateEvent.id === id) {
      setEventData(stateEvent);
      setLoading(false);
    }
    fetchEventDetails(); // Always fetch freshest data
  }, [id, stateEvent, fetchEventDetails]);

  const handleBack = () => navigate(-1);

  const handleContact = () => {
    if (eventData?.organizer?.email) {
      window.location.href = `mailto:${eventData.organizer.email}`;
    } else {
      toast.error('Organizer email not available.');
    }
  };

  // Handle image loading errors
  const handleImageError = (e) => {
    e.target.src = fallbackImage; // Fallback image
    e.target.onerror = null; // Prevent infinite loop
  };


  if (loading) return <div className="event-details__loading">Loading event...</div>;
  if (error || !eventData) return (
    <div className="event-details__error">
      <p>{error || "Event details could not be loaded."}</p>
      <button onClick={handleBack} className="event-details__back-button">Go Back</button>
    </div>
  );

  // Derived fields (ensure they handle null/undefined gracefully)
  const title = eventData.name || 'Untitled Event';
  const displayDateTime = formatDateTime(eventData.startDateTime, eventData.endDateTime);
  const locationName = eventData.venue?.name || 'N/A';
  const locationAddress = eventData.venue?.location || 'N/A';
  const capacity = eventData.expectedAttend || eventData.venue?.capacity || 'N/A';
  const price = eventData.isFree
    ? 'Free'
    : (eventData.ticketDefinitions?.[0]?.price ? `R${eventData.ticketDefinitions[0].price}` : 'Paid (details TBD)');
  const organizer = eventData.organizer?.name || 'N/A';
  const description = eventData.description || 'No description is available for this event.';
  const tags = eventData.tags || (eventData.Theme ? [eventData.Theme.name] : []);

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end) - new Date(start);
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return `${diffHours} hours`;
  };
  const duration = calculateDuration(eventData.startDateTime, eventData.endDateTime);


  return (
    <div className="event-details">
      {/* Image & Back Button */}
      <div className="event-details__image-container">
        {eventData.image && (
          <img
            src={eventData.image}
            alt={title}
            className="event-details__image"
            onError={handleImageError}
          />
        )}
        <button className="event-details__back-button" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Event Content */}
      <div className="event-details__content">
        <header className="event-details__header">
          <h1 className="event-details__title">{title}</h1>
          <span className="event-details__category">
            {eventData.Theme?.name || eventData.category || 'General'}
          </span>
        </header>

        <div className="event-details__details-section">
          <Detail icon={<Calendar />} text={displayDateTime} />
          <Detail icon={<MapPin />} text={`${locationName}, ${locationAddress}`} />
          <Detail icon={<Clock />} text={duration} />
          <Detail icon={<Users />} text={capacity} />
          <Detail icon={<Building />} text={`Organized by: ${organizer}`} />
          <Detail icon={<Tag />} text={`Price: ${price}`} />
        </div>

        <Section title="About this Event">
          <p className="event-details__description">{description}</p>
        </Section>

        {tags.length > 0 && (
          <Section title="Tags">
            <div className="event-details__tags">
              {tags.map((tag, i) => (
                <span key={i} className="event-details__tag">
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {eventData.organizer?.email && (
          <Section title="Contact Information">
            <button className="event-details__contact-row" onClick={handleContact}>
              <Mail size={20} className="event-details__icon" />
              <span>{eventData.organizer.email}</span>
            </button>
          </Section>
        )}
      </div>
    </div>
  );
};

// Helper components for cleaner JSX
const Detail = ({ icon, text }) => (
  <div className="event-details__detail-row">
    {React.cloneElement(icon, { size: 20, className: 'event-details__icon' })}
    <span>{text}</span>
  </div>
);

const Section = ({ title, children }) => (
  <section className="event-details__section">
    <h2 className="event-details__section-title">{title}</h2>
    {children}
  </section>
);

export default EventDetails;