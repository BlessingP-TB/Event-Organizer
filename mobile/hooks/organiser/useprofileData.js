// hooks/useProfileData.js
import { useState, useEffect } from 'react';
import { profileData } from '../../data/Organiser/Profile';
export const useProfileData = () => {
   const [data, setData] = useState(null);
 
  useEffect(() => {

    setData( profileData );
  }, []);

  return data;
};
