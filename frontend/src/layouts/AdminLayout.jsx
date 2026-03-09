// frontend/src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import ModernSidebar from "../components/ModernSideBar";
import { adminLinks } from "../constants/sidebarLinks";
import Footer from "../components/Footer";  
import "../styles/components/_adminlayout.scss";

const AdminLayout = () => {
  return (
    <div className="admin-layout-container">
      <ModernSidebar
        role="ADMIN"
        links={adminLinks}
        storageKey="adminNotifications"
      />

      <main className="admin-layout-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default AdminLayout;
