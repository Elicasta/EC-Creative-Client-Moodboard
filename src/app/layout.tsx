import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EC Moodboard Studio',
  description: 'EC Creative Studio — AI-powered moodboard generation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
