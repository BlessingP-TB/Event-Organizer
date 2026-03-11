// hooks/useProfileData.js
import { useState, useEffect } from 'react';
import { profileData } from '../../data/Admin/Profile';

export const useProfileData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const filteredData = {
      ...profileData,
      userInfo: profileData.userInfo.filter(item => item.label === 'Name'),
    };
    setData(filteredData);
  }, []);

  return data;
};
