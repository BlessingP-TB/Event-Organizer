import React from "react";
import { Outlet } from "react-router-dom";
import ModernSidebar from "../components/ModernSideBar";
import { attendeeLinks } from "../constants/sidebarLinks";
import Footer from "../components/Footer";
import "../styles/components/_attendeeLayout.scss";

const AttendeeLayout = () => {
  return (
    <div className="attendee-layout-container">
      {/* Sidebar */}
      <ModernSidebar
        role="ATTENDEE"
        links={attendeeLinks}
        storageKey="attendeeNotifications"
      />

      {/* Main content */}
      <main className="attendee-layout-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default AttendeeLayout;
