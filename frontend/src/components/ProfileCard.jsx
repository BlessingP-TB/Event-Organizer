// src/components/ProfileCard.jsx
import React from "react";
import "../styles/components/_profilecard.scss";

const ProfileCard = ({
  name,
  email,
  profileImg,
  onImgClick,
  fileInputRef,
  onImageChange,
  onLogout,
  additionalFields,
}) => {
  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-img-wrapper" onClick={onImgClick}>
          <img src={profileImg} alt="Profile" className="profile-img" />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={onImageChange}
            accept="image/*"
          />
        </div>
        <h2>{name}</h2>
        <p>{email}</p>
      </div>

      <div className="profile-details">
        <div className="details-grid">
          {Object.entries(additionalFields).map(([key, value]) => (
            <div className="detail-item" key={key}>
              <strong>{key}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
};

export default ProfileCard;
