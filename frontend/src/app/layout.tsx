import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MetiTrack — Meticuly Titanium Additive Manufacturing MES',
  description:
    'Patient-Specific Implants (PSI) Sequential Workflow & Resource Tracking Platform (ISO 13485:2016 Compliant)',
  icons: {
    icon: '/meticuly-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}>
      <body className="bg-[#070B14] text-slate-100 overflow-hidden">{children}</body>
    </html>
  );
}
