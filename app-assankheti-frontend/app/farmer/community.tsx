import React from 'react';
import { FarmerCommunityDashboard } from '@/components/farmer-community-dashboard';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FarmerCommunityScreen() {
  const { textLanguage } = useLanguage();
  return <FarmerCommunityDashboard textLanguage={textLanguage} />;
}
