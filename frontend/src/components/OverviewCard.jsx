import React from 'react';

const OverviewCard = ({ title, value, change, isPositive, icon }) => {
  return (
    <div className="overview-card">
      <div className="overview-header">
        <span>{title}</span>
        <i className={icon}></i>
      </div>
      <h2>{value}</h2>
      {change && (
        <p className={isPositive ? 'positive' : 'negative'}>
          {isPositive ? '▲' : '▼'} {change} {isPositive ? 'increase' : 'decrease'}
        </p>
      )}
    </div>
  );
};

export default OverviewCard;
