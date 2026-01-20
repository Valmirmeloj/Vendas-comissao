
// Fix: Import React to resolve 'Cannot find namespace React' error on line 5
import React from 'react';

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

export type Opportunity = {
  id: string;
  title: string;
  source: string;
  value: number;
  days: number;
  avatar: string;
  tags: string[];
};
