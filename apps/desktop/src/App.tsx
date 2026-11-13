import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { QuickDownloader } from './components/QuickDownloader.js';
import { SettingsModal } from './components/SettingsModal.js';
import { useTheme } from './hooks/useTheme.js';
import { loadSettings } from './services/storage.js';

export const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { setTheme } = useTheme();

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sleek Minimal Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

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
        <QuickDownloader onOpenSettings={() => setIsSettingsOpen(true)} />
      </main>

      {/* Settings Modal (Theme, Folder, Cookies for Instagram/YouTube) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onThemeChanged={() => setTheme(loadSettings().theme || 'dark')}
      />

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
