import { useEffect, useState } from 'react';
import api from '../api/axios';
import { safeBrandLogo } from '../lib/publicWelcomePage';

export default function usePublicWelcomeLogo() {
  const [logo, setLogo] = useState('');

  useEffect(() => {
    let active = true;
    let updatedDuringLoad = false;
    const updateLogo = event => {
      updatedDuringLoad = true;
      setLogo(safeBrandLogo(event.detail));
    };
    api.get('/public/welcome-page')
      .then(({ data }) => { if (active && !updatedDuringLoad) setLogo(safeBrandLogo(data?.brandLogo)); })
      .catch(error => console.error('Public welcome logo could not be loaded:', error.response?.data?.message || error.message));
    window.addEventListener('wepzo:public-welcome-logo-updated', updateLogo);
    return () => {
      active = false;
      window.removeEventListener('wepzo:public-welcome-logo-updated', updateLogo);
    };
  }, []);

  return logo;
}
