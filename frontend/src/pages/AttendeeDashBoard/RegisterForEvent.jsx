import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Users, Building, Tag, Mail, ArrowLeft } from 'lucide-react';
import { IoInformationCircleOutline, IoLockClosedOutline } from 'react-icons/io5';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast'; // Import toast
import api from '../../utils/api'; // Import the centralized API utility
import '../../styles/pages/_eventregistrations.scss'; // Assuming you create this SCSS file

// Helper component for details (reusing from EventDetails)
const Detail = ({ icon, text }) => (
  <div className="event-details__detail-row">
    {React.cloneElement(icon, { size: 20, className: 'event-details__icon' })}
    <span>{text}</span>
  </div>
);

// Helper component for sections (reusing from EventDetails)
const Section = ({ title, children }) => (
  <section className="event-details__section">
    <h2 className="event-details__section-title">{title}</h2>
    {children}
  </section>
);

const RegisterForEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEventData = location.state?.eventData; // Event data passed from previous route
  const [eventData, setEventData] = useState(initialEventData || null); // Full event data from API if fetched
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeUpdates, setSubscribeUpdates] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!initialEventData);
  const [submitting, setSubmitting] = useState(false);

  const eventId = initialEventData?.id; // Get ID from passed data
  console.log("RegisterForEvent - eventId:", eventId);
  // Fetch event details (even if passed, to ensure freshness)
  const fetchEventDetails = useCallback(async () => {
    if (!eventId) {
      toast.error("Event ID is missing for registration.");
      setLoadingEvent(false);
      return;
    }
    try {
      setLoadingEvent(true);
      const response = await api.get(`/events/${eventId}`);
      setEventData(response.data);
    } catch (err) {
      console.error('Error fetching event details for registration:', err);
      // toast.error is handled by api.js interceptor
      setEventData(null); // Clear event data if fetch fails
    } finally {
      setLoadingEvent(false);
    }
  }, [eventId]);

  // Fetch existing registration (if any)
  const fetchRegistrationStatus = useCallback(async () => {
    if (!eventId) {
      setLoadingRegistration(false);
      return;
    }
    try {
      setLoadingRegistration(true);
      // Assuming an endpoint like /registrations/my/:eventId to check specific event registration
      const response = await api.get(`/registrations/my/${eventId}`);
      setIsRegistered(!!response.data); // If data exists, user is registered
    } catch (err) {
      if (err.response?.status === 404) {
        setIsRegistered(false); // Not registered yet
      } else {
        console.error('Error fetching registration status:', err);
        // toast.error is handled by api.js interceptor
      }
    } finally {
      setLoadingRegistration(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetails();
    fetchRegistrationStatus();
  }, [fetchEventDetails, fetchRegistrationStatus]);

  const handleContact = () => {
    if (eventData?.organizer?.email) {
      window.location.href = `mailto:${eventData.organizer.email}`;
    } else {
      toast.error('Organizer email not available.');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleRegister = async () => {
    if (!acceptedTerms) {
      toast.error("You must agree to the Terms and Privacy Policy to register.");
      return;
    }
    if (!eventId) {
      toast.error("Cannot register: Event ID is missing.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        `/events/${eventId}/registrations`, // Use the event-specific registration route
        { subscribeUpdates }
      );

      // Success message handled by api.js interceptor
      setIsRegistered(true); // Update UI immediately
      toast.success(`Successfully registered for ${eventData?.name || 'the event'}!`);
      navigate('/attendee/my-events'); // Redirect to my events page

    } catch (err) {
      console.error('Error registering for event:', err);
      // toast.error is handled by api.js interceptor
    } finally {
      setSubmitting(false);
    }

    // After registration succeeds
const newNotification = {
  id: Date.now(),
  title: "Registration Successful",
  message: `You have successfully registered for ${eventData.name}. You will be reminded when the event is close.`,
  timestamp: new Date().toLocaleString(),
  read: false,
};

// Update localStorage notifications
const existingNotifications = JSON.parse(localStorage.getItem('attendeeNotifications') || '[]');
localStorage.setItem('attendeeNotifications', JSON.stringify([newNotification, ...existingNotifications]));

// Dispatch event so sidebar updates live
window.dispatchEvent(new Event('attendeeNotificationsUpdated'));

  };

  // Derived fields (ensure they handle null/undefined gracefully, using `eventData` state)
  const title = eventData?.name || 'Untitled Event';
  const displayDateTime = eventData ? new Date(eventData.startDateTime).toLocaleString() : 'N/A';
  const locationName = eventData?.venue?.name || 'N/A';
  const locationAddress = eventData?.venue?.location || 'N/A';
  const capacity = eventData?.expectedAttend || eventData?.venue?.capacity || 'N/A';
  const price = eventData?.isFree
    ? 'Free'
    : (eventData?.ticketDefinitions?.[0]?.price ? `R${eventData.ticketDefinitions[0].price}` : 'Paid (details TBD)');
  const organizer = eventData?.organizer?.name || 'N/A';
  const description = eventData?.description || 'No description is available for this event.';
  const tags = eventData?.tags || (eventData?.Theme ? [eventData.Theme.name] : []);

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end) - new Date(start);
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return `${diffHours} hours`;
  };
  const duration = calculateDuration(eventData?.startDateTime, eventData?.endDateTime);

  if (loadingEvent) {
    return <div className="register-event-page loading">Loading event details...</div>;
  }
  if (!eventData) {
    return (
      <div className="register-event-page error">
        <p>Event not found or failed to load.</p>
        <button onClick={handleBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="register-event-page">
      {/* Image & Back Button */}
      <div className="event-details__image-container">
        <img src={eventData.image || '/assets/images/eventPic.PNG'} alt={title} className="event-details__image" />
        <button className="event-details__back-button" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="event-details__content">
        {/* Header */}
        <div className="event-details__header">
          <h1 className="event-details__title">{title}</h1>
          <span className="event-details__category">{eventData.Theme?.name || eventData.category || 'General'}</span>
        </div>

        {/* Event Info */}
        <div className="event-details__details-section">
          <Detail icon={<Calendar />} text={displayDateTime} />
          <Detail icon={<MapPin />} text={`${locationName}, ${locationAddress}`} />
          <Detail icon={<Clock />} text={duration} />
          <Detail icon={<Users />} text={capacity} />
          <Detail icon={<Building />} text={`Organized by: ${organizer}`} />
          <Detail icon={<Tag />} text={`Price: ${price}`} />
        </div>

        {/* About Section */}
        <Section title="About this Event">
          <p className="event-details__description">{description}</p>
        </Section>

        {/* Tags */}
        {tags.length > 0 && (
          <Section title="Tags">
            <div className="event-details__tags">
              {tags.map((tag, index) => (
                <span key={index} className="event-details__tag">{tag}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Contact */}
        {eventData.organizer?.email && (
          <Section title="Contact Information">
            <button className="event-details__contact-row" onClick={handleContact}>
              <Mail size={20} className="event-details__icon" />
              <span>{eventData.organizer.email}</span>
            </button>
          </Section>
        )}

        {/* Registration Section */}
        <section className="event-details__section registration-section">
          {loadingRegistration ? (
            <p className="loading-message">Checking registration status...</p>
          ) : isRegistered ? (
            <div className="registered-message">
              <IoInformationCircleOutline size={24} />
              <p>You are already registered for this event.</p>
              <button className="view-my-events-btn" onClick={() => navigate('/attendee/my-events')}>View My Events</button>
            </div>
          ) : (
            <>
              {/* Checkboxes */}
              <div className="checkbox-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={() => setAcceptedTerms(!acceptedTerms)}
                    disabled={submitting}
                  />
                  <span>
                    I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Terms</a> and <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a> *
                  </span>
                </label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={subscribeUpdates}
                    onChange={() => setSubscribeUpdates(!subscribeUpdates)}
                    disabled={submitting}
                  />
                  <span>Subscribe to event updates and notifications</span>
                </label>
              </div>

              {/* Info Box */}
              <div className="info-box">
                <IoInformationCircleOutline size={20} color="#1976d2" />
                <p>
                  You’ll receive a confirmation email with event details. Bring your student ID to check in.
                </p>
              </div>

              {/* Register Button */}
              <button
                className="register-btn"
                onClick={handleRegister}
                disabled={!acceptedTerms || submitting}
              >
                {submitting ? "Processing..." : "Register Now"}
                <IoLockClosedOutline size={18} />
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default RegisterForEvent;