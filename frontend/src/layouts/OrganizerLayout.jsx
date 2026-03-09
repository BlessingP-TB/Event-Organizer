// OrganizerLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import ModernSideBar from "../components/ModernSideBar";
import Footer from "../components/Footer";
import { organizerLinks } from "../constants/sidebarLinks";
import "../styles/components/_organizerlayout.scss";

const OrganizerLayout = () => {
  return (
    <div className="organizer-layout-container">
      <ModernSideBar
        role="ORGANIZER"
        links={organizerLinks}
        storageKey="organizerNotifications"
      />
      <main className="organizer-layout-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default OrganizerLayout;
