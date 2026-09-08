'use client';

import React from 'react';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      {children}
      <GlobalAudioPlayer />
    </AudioPlayerProvider>
  );
}
