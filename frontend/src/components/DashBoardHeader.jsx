import React from 'react';

const DashboardHeader = ({ user }) => {
  return (
    <header className="dashboard-header">
      <h2>Welcome back, {user}!</h2>
      <h1>Dashboard Overview</h1>
    </header>
  );
};

export default DashboardHeader;
