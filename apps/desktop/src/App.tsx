import React from 'react';
import { Header } from './components/Header.js';
import { QuickDownloader } from './components/QuickDownloader.js';

export const App: React.FC = () => {
  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sleek Minimal Header */}
      <Header />

      {/* Main Drop-and-Paste Experience */}
      <main
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <QuickDownloader />
      </main>

      {/* Minimal Discreet Footer */}
      <footer
        style={{
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>OneClick</span>
      </footer>
    </div>
  );
};
