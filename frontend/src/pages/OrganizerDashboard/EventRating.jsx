import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/pages/_eventrating.scss';

export default function RatingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { department, adminName } = location.state || {};
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

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

  const submitRating = () => {
    if (rating === 0) {
      alert('Please select a star rating before submitting.');
      return;
    }

    if (selectedCategories.length === 0) {
      alert('Please select at least one rating category.');
      return;
    }

    const ratingData = {
      rating,
      comments,
      categories: selectedCategories,
      department,
      adminName,
      timestamp: new Date(),
    };

    console.log('Rating submitted:', ratingData);

    alert('Thank you! Your rating has been submitted successfully.');
    navigate('/organizer');
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
      1: '#FF6B6B',
      2: '#FFA726',
      3: '#FFD700',
      4: '#9CCC65',
      5: '#66BB6A'
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
            {adminName ? `with ${adminName}` : 'with TUT Administration'}
          </p>
        </div>
        <div style={{ width: '24px' }} />
      </div>

      <div className="content">
        {/* Rating Section */}
        <div className="section">
          <h2 className="section-title">Overall Rating</h2>
          <p className="section-description">
            How would you rate your experience with {adminName || 'the administrator'}?
          </p>

          <div className="stars-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="star-button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
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
            />
            <p className="char-count">{comments.length}/500</p>
          </div>
        </div>

        {/* Department Info */}
        {department && (
          <div className="department-section">
            <span className="material-icons">business</span>
            <p className="department-text">Department: {department}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="footer">
        <button
          className={`submit-button ${
            rating === 0 || selectedCategories.length === 0 ? 'disabled' : ''
          }`}
          onClick={submitRating}
          disabled={rating === 0 || selectedCategories.length === 0}
        >
          <span className="submit-button-text">Submit Rating</span>
          <span className="material-icons">check_circle_outline</span>
        </button>
      </div>
    </div>
  );
}
