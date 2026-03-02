// src/pages/AttendeeDashBoard/EventRating.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast'; // Import toast
import api from '../../utils/api'; // Import the centralized API utility
import '../../styles/pages/_eventrating.scss'; // Ensure this SCSS file is used

export default function RatingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { department, adminName, eventData } = location.state || {}; // Ensure eventData is passed if rating an event

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive a unique key for the rating target
  const getRatingKey = useCallback(() => {
    if (eventData?.id) return `rating_event_${eventData.id}`;
    if (adminName) return `rating_admin_${adminName}`;
    if (department) return `rating_dept_${department}`;
    return 'rating_general';
  }, [eventData, adminName, department]);

  // Check if already rated on mount
  useEffect(() => {
    const key = getRatingKey();
    const existingRating = localStorage.getItem(key);
    if (existingRating) {
      setAlreadyRated(true);
      toast('You have previously rated this experience.', { icon: 'ℹ️' });
    }
  }, [getRatingKey]);

  const ratingCategories = [
    { id: 'response_time', label: 'Response Time', icon: 'access_time' },
    { id: 'helpfulness', label: 'Helpfulness', icon: 'thumb_up' },
    { id: 'professionalism', label: 'Professionalism', icon: 'business' },
    { id: 'knowledge', label: 'Knowledge', icon: 'school' },
    { id: 'communication', label: 'Communication', icon: 'chat_bubble' },
  ];

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const submitRating = async () => {
    if (alreadyRated) {
      toast.error(`You have already rated ${eventData ? 'this event' : 'this experience'}.`);
      return;
    }

    if (rating === 0) {
      toast.error('Please select a star rating before submitting.');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('Please select at least one rating category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ratingData = {
        rating,
        comments,
        categories: selectedCategories,
        // Include eventId if rating an event, or other identifiers
        eventId: eventData?.id || null,
        adminName: adminName || null,
        department: department || null,
      };

      // ✅ Send rating to your backend API
      // You'll need an endpoint like POST /ratings or POST /events/:eventId/ratings
      const response = await api.post('/ratings', ratingData); // Adjust endpoint as per your backend
      console.log('Rating submitted successfully:', response.data);

      // Store in localStorage to prevent multiple ratings
      const key = getRatingKey();
      localStorage.setItem(key, JSON.stringify(ratingData));
      setAlreadyRated(true); // Update state to prevent further submissions

      toast.success('Thank you! Your rating has been submitted successfully.');

      // Navigate to My Events or a confirmation page
      navigate("/attendee/my-events");

    } catch (err) {
      console.error('Error submitting rating:', err);
      // toast.error is handled by api.js interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = () => {
    const texts = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return texts[rating] || 'Select Rating';
  };

  const getRatingColor = () => {
    const colors = {
      1: '#FF6B6B', // Red
      2: '#FFA726', // Orange
      3: '#FFD700', // Gold
      4: '#9CCC65', // Light Green
      5: '#66BB6A'  // Green
    };
    return colors[rating] || '#666';
  };

  return (
    <div className="ratings-page">
      {/* Header */}
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="header-info">
          <h1 className="header-title">Rate Your Experience</h1>
          <p className="header-subtitle">
            {eventData ? `for ${eventData.title}` : adminName ? `with ${adminName}` : 'with TUT Administration'}
          </p>
        </div>
        <div style={{ width: '24px' }} /> {/* Spacer */}
      </div>

      <div className="content">
        {/* Rating Section */}
        <div className="section">
          <h2 className="section-title">Overall Rating</h2>
          <p className="section-description">
            How would you rate your experience {eventData ? `at ${eventData.title}` : `with ${adminName || 'the administrator'}`}?
          </p>

          <div className="stars-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="star-button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={alreadyRated || isSubmitting}
              >
                <span
                  className={`material-icons ${
                    star <= (hoverRating || rating) ? 'filled' : ''
                  }`}
                >
                  {star <= (hoverRating || rating) ? 'star' : 'star_border'}
                </span>
              </button>
            ))}
          </div>

          <div className="rating-text-container">
            <p className="rating-text" style={{ color: getRatingColor() }}>
              {getRatingText()}
            </p>
          </div>
        </div>

        {/* Categories Section */}
        <div className="section">
          <h2 className="section-title">What was great?</h2>
          <p className="section-description">
            Select categories that stood out (select all that apply)
          </p>

          <div className="categories-container">
            {ratingCategories.map((category) => (
              <button
                key={category.id}
                className={`category-button ${
                  selectedCategories.includes(category.id) ? 'selected' : ''
                }`}
                onClick={() => toggleCategory(category.id)}
                disabled={alreadyRated || isSubmitting}
              >
                <span className="material-icons">{category.icon}</span>
                <span className="category-text">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="section">
          <h2 className="section-title">Additional Comments</h2>
          <p className="section-description">
            Share more details about your experience (optional)
          </p>

          <div className="comments-container">
            <textarea
              className="comments-input"
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 500))}
              placeholder="Tell us more about your experience..."
              rows={4}
              disabled={alreadyRated || isSubmitting}
            />
            <p className="char-count">{comments.length}/500</p>
          </div>
        </div>

        {/* Department Info (optional) */}
        {department && (
          <div className="department-section">
            <span className="material-icons">business</span>
            <p className="department-text">Department: {department}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="footer">
        {alreadyRated ? (
          <div className="already-rated-message">
            <span className="material-icons">check_circle</span>
            <p>You have already rated {eventData ? 'this event' : 'this administrator'}.</p>
          </div>
        ) : (
          <button
            className={`submit-button ${
              rating === 0 || selectedCategories.length === 0 || isSubmitting ? 'disabled' : ''
            }`}
            onClick={submitRating}
            disabled={rating === 0 || selectedCategories.length === 0 || isSubmitting}
          >
            <span className="submit-button-text">
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </span>
            <span className="material-icons">check_circle_outline</span>
          </button>
        )}
      </div>
    </div>
  );
}