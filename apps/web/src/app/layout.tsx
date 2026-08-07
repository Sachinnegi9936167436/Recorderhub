import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
