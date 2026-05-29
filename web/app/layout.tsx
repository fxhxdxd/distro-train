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
  title: 'distro-train — Decentralized Federated Learning',
  description:
    'A peer-to-peer ML marketplace built on py-libp2p, Hedera, and IPFS. Train any model on any hardware without trusting a central server.',
  openGraph: {
    title: 'distro-train',
    description:
      'Decentralized federated learning with Byzantine-robust aggregation, Hedera smart contracts, and IPFS storage.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
