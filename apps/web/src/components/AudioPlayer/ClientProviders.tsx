'use client';

import React from 'react';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';
import { ActivityTracker } from '@/components/ActivityTracker';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      <ActivityTracker />
      {children}
      <GlobalAudioPlayer />
    </AudioPlayerProvider>
  );
}
