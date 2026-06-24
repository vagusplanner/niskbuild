import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AIIntelligence() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Calendar page with AI features
    navigate(createPageUrl('Calendar'));
  }, [navigate]);

  return null;
}