// src/pages/AttendeeDashBoard/ViewEventDetails.jsx (Refactored & Consolidated Logic)
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Building, Tag, Mail, ArrowLeft } from 'lucide-react';
import api from '../../utils/api'; // Use refactored api
import toast from 'react-hot-toast'; // Import toast
import '../../styles/pages/ViewEventDetails.scss'; // Assuming this SCSS covers event details
import defaultEventImage from '../../assets/images/eventPic.PNG';

/** 🕒 Format readable date/time range */
const formatDateTime = (start, end) => {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const startStr = startDate.toLocaleString(undefined, options);
  const endStr = endDate ? endDate.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

  return endStr ? `${startStr} - ${endStr}` : startStr;
};

/** Function to calculate duration */
const calculateDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diffHours = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60));
  return `${diffHours} hours`;
};

// Helper components for cleaner JSX (can be moved to a shared component file if used often)
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

const ViewEventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** ⏪ Go back to the previous page */
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  /** 📧 Open mailto link */
  const handleContact = useCallback(() => {
    if (eventData?.organizer?.email && eventData.organizer.email !== 'N/A') {
      window.location.href = `mailto:${eventData.organizer.email}`;
    } else {
      toast.error('Organizer contact email is not available.', { id: 'no-organizer-email' });
    }
  }, [eventData]);

  /** 🖼️ Replace broken image with default placeholder */
  const handleImageError = useCallback((e) => {
    e.target.src = DEFAULT_IMAGE;
  }, []);

  /** 🌐 Fetch event details */
  useEffect(() => {
    if (!id) {
      setError('No event ID found in URL.');
      setLoading(false);
      toast.error('Event ID missing from URL.', { id: 'event-id-missing' });
      return;
    }

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/events/${id}`); // Use the centralized API instance
        setEventData(res.data); // Store raw data, map derived fields in render
        toast.success("Event details loaded successfully!");
      } catch (err) {
        console.error('❌ Error fetching event:', err);
        setError('Failed to load event details. Please try again.');
        // api.js interceptor will handle toast message for API errors
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  /** 🌀 Loading state */
  if (loading)
    return <div className="event-details__loading">Loading event details...</div>;

  /** ❌ Error state */
  if (error)
    return (
      <div className="event-details__error">
        <p>{error}</p>
        <button onClick={handleBack}>Go Back</button>
      </div>
    );

  /** 🕳️ No event found */
  if (!eventData)
    return (
      <div className="event-details__not-found">
        <p>Event not found or no data available.</p>
        <button onClick={handleBack}>Go Back</button>
      </div>
    );

  // Derived fields for consistent display based on fetched eventData
  const title = eventData.name || 'Untitled Event';
  const category = eventData.Theme?.name || 'General';
  const image = eventData.image || defaultEventImage;
  const dateFormatted = formatDateTime(eventData.startDateTime, eventData.endDateTime);
  const locationInfo = `${eventData.venue?.name || 'TBD'}, ${eventData.venue?.location || 'N/A'}`;
  const duration = calculateDuration(eventData.startDateTime, eventData.endDateTime);
  const capacity = eventData.venue?.capacity || eventData.expectedAttend || 'N/A';
  const organizer = eventData.organizer?.name || 'N/A';
  const price = eventData.isFree
    ? 'Free'
    : (eventData.ticketDefinitions?.[0]?.price ? `R${eventData.ticketDefinitions[0].price}` : 'Free');
  const description = eventData.description || 'No description available.';
  const tags = eventData.Theme ? [eventData.Theme.name] : []; // Example: Use theme as a tag
  const contactEmail = eventData.organizer?.email || 'N/A';

  return (
    <div className="event-details">
      {/* 🖼️ Image Header */}
      <div className="event-details__image-container">
        <img
          src={image}
          alt={title}
          className="event-details__image"
          onError={handleImageError}
        />
        <button className="event-details__back-button" onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* 📋 Event Content */}
      <div className="event-details__content">
        <header className="event-details__header">
          <h1 className="event-details__title">{title}</h1>
          <span className="event-details__category">{category}</span>
        </header>

        <div className="event-details__details-section">
          <Detail icon={<Calendar />} text={dateFormatted} />
          <Detail icon={<MapPin />} text={locationInfo} />
          <Detail icon={<Clock />} text={duration} />
          <Detail icon={<Users />} text={capacity} />
          <Detail icon={<Building />} text={`Organized by: ${organizer}`} />
          <Detail icon={<Tag />} text={`Price: ${price}`} />
        </div>

        <Section title="About this Event">
          <p>{description}</p>
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

        {contactEmail !== 'N/A' && (
          <Section title="Contact Information">
            <button onClick={handleContact} className="event-details__contact-row">
              <Mail size={20} />
              <span>{contactEmail}</span>
            </button>
          </Section>
        )}
      </div>
    </div>
  );
};

export default ViewEventDetails;