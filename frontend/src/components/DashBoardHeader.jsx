import React from 'react';

const DashboardHeader = ({ user, title, subtitle }) => {
  const resolvedTitle = title || `Welcome, ${user || 'User'}!`;
  const resolvedSubtitle = subtitle || 'Dashboard Overview';

  return (
    <header className="dashboard-header">
      <h2>{resolvedTitle}</h2>
      <h1>{resolvedSubtitle}</h1>
    </header>
  );
};

export default DashboardHeader;
