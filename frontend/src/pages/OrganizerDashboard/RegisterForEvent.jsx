import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Building, Tag, Mail, ArrowLeft } from 'lucide-react';
import { IoInformationCircleOutline, IoLockClosedOutline } from 'react-icons/io5';
import '../../styles/pages/ViewEventDetails.scss';
import { useNavigate } from 'react-router-dom';

const RegisterForEvent = () => {
  const navigate = useNavigate();

  const [event] = useState({
    title: "Annual Tech Summit",
    category: "Technology",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
    date: "Saturday, 19 October at 09:00 AM",
    location: "San Francisco Convention Center",
    duration: "8 hours",
    capacity: "500 attendees",
    organizer: "Tech Innovators Inc.",
    price: "Free",
    description:
      "Join industry leaders for a full day of talks, workshops, and networking around the latest in AI, cloud computing, and startup innovation.",
    tags: ["AI", "Startup", "Networking"],
    contact: "info@techinnovators.com",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeUpdates, setSubscribeUpdates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const handleContact = () => {
    window.location.href = `mailto:${event.contact}`;
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleRegister = () => {
    if (!acceptedTerms) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setToast(true); // show toast

      // Auto-hide toast and navigate after 2 seconds
      setTimeout(() => {
        setToast(false);
        navigate('/organizer/discover');
      }, 2000);
    }, 1000);
  };

  return (
    <div className="event-details">
      {/* Toast Message */}
      {toast && (
        <div className="bottom-toast">
          <div className="bottom-toast-inner">
            <span className="toast-message">
              Successfully registered for <strong>{event.title}</strong>
            </span>
            <button className="toast-close" onClick={() => setToast(false)}>×</button>
          </div>
        </div>
      )}

      {/* Image & Back Button */}
      <div className="event-details__image-container">
        <img src={event.image} alt={event.title} className="event-details__image" />
        <button className="event-details__back-button" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="event-details__content">
        {/* Header */}
        <div className="event-details__header">
          <h1 className="event-details__title">{event.title}</h1>
          <span className="event-details__category">{event.category}</span>
        </div>

        {/* Event Info */}
        <div className="event-details__details-section">
          <div className="event-details__detail-row">
            <Calendar size={20} className="event-details__icon" />
            <span>{event.date}</span>
          </div>
          <div className="event-details__detail-row">
            <MapPin size={20} className="event-details__icon" />
            <span>{event.location}</span>
          </div>
          <div className="event-details__detail-row">
            <Clock size={20} className="event-details__icon" />
            <span>{event.duration}</span>
          </div>
          <div className="event-details__detail-row">
            <Users size={20} className="event-details__icon" />
            <span>{event.capacity}</span>
          </div>
          <div className="event-details__detail-row">
            <Building size={20} className="event-details__icon" />
            <span>Organized by: {event.organizer}</span>
          </div>
          <div className="event-details__detail-row">
            <Tag size={20} className="event-details__icon" />
            <span>Price: {event.price}</span>
          </div>
        </div>

        {/* About Section */}
        <section className="event-details__section">
          <h2 className="event-details__section-title">About this Event</h2>
          <p className="event-details__description">{event.description}</p>
        </section>

        {/* Tags */}
        <section className="event-details__section">
          <h2 className="event-details__section-title">Tags</h2>
          <div className="event-details__tags">
            {event.tags.map((tag, index) => (
              <span key={index} className="event-details__tag">{tag}</span>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="event-details__section">
          <h2 className="event-details__section-title">Contact Information</h2>
          <button className="event-details__contact-row" onClick={handleContact}>
            <Mail size={20} className="event-details__icon" />
            <span>{event.contact}</span>
          </button>
        </section>

        {/* Checkboxes & Register */}
        <section className="event-details__section">
          <div className="checkbox-section">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={() => setAcceptedTerms(!acceptedTerms)}
              />
              <span>
                I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a> *
              </span>
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={subscribeUpdates}
                onChange={() => setSubscribeUpdates(!subscribeUpdates)}
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
            disabled={!acceptedTerms || loading}
          >
            {loading ? "Processing..." : "Register Now"}
            <IoLockClosedOutline size={18} />
          </button>
        </section>
      </div>
    </div>
  );
};

export default RegisterForEvent;
