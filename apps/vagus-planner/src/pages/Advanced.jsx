import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Advanced() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Settings page
    navigate(createPageUrl('Settings'));
  }, [navigate]);

  return null;
}