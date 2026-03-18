import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'VedaAI - AI Assessment Creator',
  description: 'Create intelligent, AI-powered question papers with structured sections, difficulty levels, and answer keys.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Header />
            <div className="page-content">
              {children}
            </div>
          </div>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
