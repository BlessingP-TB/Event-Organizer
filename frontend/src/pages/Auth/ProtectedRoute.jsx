import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  // Use consistent localStorage keys
  const accessToken = localStorage.getItem("accessToken");
  const userRole = localStorage.getItem("role")?.toUpperCase(); // Ensure role is always uppercase

  // If no access token, user is not logged in
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // If a token exists but no role (shouldn't happen if login is successful)
  if (!userRole) {
    // Potentially a corrupted state or new user. Force re-login.
    localStorage.clear(); // Clear potentially partial data
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles are specified, check if the user's role is included
  if (allowedRoles.length > 0) {
    const allowedRolesUpper = allowedRoles.map((r) => r.toUpperCase());
    if (!allowedRolesUpper.includes(userRole)) {
      // User is logged in but does not have the necessary role
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If all checks pass, render the child components
  return children;
}