import React from 'react';
import Sidebar from './Sidebar';
import NowPlayingBar from './NowPlayingBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
      <NowPlayingBar />
    </div>
  );
}