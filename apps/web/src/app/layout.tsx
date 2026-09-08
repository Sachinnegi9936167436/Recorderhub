import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ClientProviders } from '@/components/AudioPlayer/ClientProviders';

export const metadata: Metadata = {
  title: 'RecordHub | Sales Call Intelligence Platform',
  description: 'Conversation Intelligence & Sales Call Quality Platform for Academically Global Healthcare Academy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
        <SpeedInsights />
      </body>
    </html>
  );
}
