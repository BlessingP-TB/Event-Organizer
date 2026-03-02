// src/pages/ProfilePage.jsx
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProfileCard from "../components/ProfileCard";
import "../styles/pages/_profilepage.scss";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [profileImg, setProfileImg] = useState("/profile.webp");
  const [profile, setProfile] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (!storedUser || !token) {
      setLoggedOut(true);
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setProfile(parsedUser);

      const savedImage = localStorage.getItem('userProfileImage');
      if (savedImage) setProfileImg(savedImage);
    } catch (err) {
      console.error("Failed to parse user data:", err);
      setLoggedOut(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image size must be less than 5MB.");

    const reader = new FileReader();
    reader.onload = (event) => {
      const newImage = event.target.result;
      setProfileImg(newImage);
      localStorage.setItem("userProfileImage", newImage);
      toast.success("Profile picture updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleImgClick = () => fileInputRef.current?.click();

  const handleProfileUpdate = (field, value) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    localStorage.setItem("user", JSON.stringify(updated));
    toast.success("Profile updated successfully!");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfileImage");
    setLoggedOut(true);
    toast.success("Logged out successfully!");
    setTimeout(() => navigate("/login"), 2000);
  };

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

  const getAdditionalFields = () => {
    if (!profile) return {};
    return {
      Phone: profile.cellphone_number || "Not Provided",
      "Member Since": profile.createdAt ? formatDate(profile.createdAt) : "N/A",
    };
  };

  if (loading)
    return (
      <div className="profile-loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );

  /* if (loggedOut)
    return (
      <div className="logout-message">
        <div className="logout-content">
          <h2>You have been logged out</h2>
          <p>Thank you for using our service. See you next time!</p>
          <button onClick={() => navigate("/")} className="home-btn">
            Go to Home Page
          </button>
        </div>
      </div>
    ); */

  if (!profile)
    return (
      <div className="profile-error-container">
        <h2>Profile Not Found</h2>
        <p>Unable to load your profile information.</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    );

  return (
    <div className="profile-page">
      <main className="profile-content">
        <ProfileCard
          name={profile.name || `Unnamed User`}
          email={profile.email || "No email provided"}
          profileImg={profileImg}
          onImgClick={handleImgClick}
          fileInputRef={fileInputRef}
          onImageChange={handleImageChange}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
          additionalFields={getAdditionalFields()}
        />
      </main>
    </div>
  );
};

export default ProfilePage;
