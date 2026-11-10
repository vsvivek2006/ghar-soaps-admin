'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

