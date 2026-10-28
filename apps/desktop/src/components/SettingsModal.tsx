import React, { useState } from 'react';
import { AppSettings } from '@clipnest/shared';
import { loadSettings, saveSettings } from '../services/storage.js';
import {
  X,
  Folder,
  Palette,
  ShieldAlert,
  Save,
  Check,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [savedToast, setSavedToast] = useState(false);
  const isElectron = Boolean(window.electronAPI?.isElectron);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    if (window.electronAPI?.chooseDirectory) {
      const selected = await window.electronAPI.chooseDirectory();
      if (selected) {
        setSettings((prev) => ({ ...prev, downloadDirectory: selected }));
      }
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    onThemeChanged();
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel fade-in modal-dialog">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
            Preferences & Settings
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Download Folder */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              <Folder size={16} color="var(--accent-cyan)" />
              <span>Download Destination Folder</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={settings.downloadDirectory}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, downloadDirectory: e.target.value }))
                }
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.86rem',
                }}
              />
              {isElectron && (
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  Browse
                </button>
              )}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              <Palette size={16} color="var(--accent-indigo)" />
              <span>Visual Theme</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, theme: t }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor:
                      settings.theme === t ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    background:
                      settings.theme === t ? 'rgba(200, 121, 44, 0.15)' : 'var(--bg-input)',
                    color: settings.theme === t ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Security & SSRF Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'var(--bg-input)',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={18} color="var(--accent-emerald)" />
              <div>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block' }}>
                  Strict SSRF Network Defense
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Block loopback (127.0.0.1), private LANs, and cloud metadata inspection
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.safeSSRF}
              onChange={(e) => setSettings((prev) => ({ ...prev, safeSSRF: e.target.checked }))}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 26,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 22px' }}>
            {savedToast ? (
              <>
                <Check size={16} />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
