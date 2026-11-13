import React, { useState, useEffect } from 'react';
import { AppSettings } from '@clipnest/shared';
import { loadSettings, saveSettings } from '../services/storage.js';
import { API_BASE_URL } from '../services/api-client.js';
import {
  X,
  Folder,
  Palette,
  ShieldAlert,
  Save,
  Check,
  KeyRound,
  Trash2,
  Upload,
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
  const [hasCookies, setHasCookies] = useState(false);
  const [availableBrowsers, setAvailableBrowsers] = useState<string[]>([]);
  const [cookieInput, setCookieInput] = useState('');
  const [cookieStatusMsg, setCookieStatusMsg] = useState('');
  const isElectron = Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE_URL}/cookies/status`)
      .then((res) => res.json())
      .then((data) => {
        setHasCookies(Boolean(data.hasCookies));
        if (Array.isArray(data.availableBrowsers)) {
          setAvailableBrowsers(data.availableBrowsers);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCookies = async () => {
    if (!cookieInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookieInput.trim() }),
      });
      if (res.ok) {
        setHasCookies(true);
        setCookieInput('');
        setCookieStatusMsg('Cookies saved successfully!');
        setTimeout(() => setCookieStatusMsg(''), 2500);
      } else {
        setCookieStatusMsg('Failed to save cookies.');
      }
    } catch {
      setCookieStatusMsg('Could not reach backend.');
    }
  };

  const handleRemoveCookies = async () => {
    try {
      await fetch(`${API_BASE_URL}/cookies`, { method: 'DELETE' });
      setHasCookies(false);
      setCookieStatusMsg('Cookies removed.');
      setTimeout(() => setCookieStatusMsg(''), 2500);
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCookieInput(content);
      }
    };
    reader.readAsText(file);
  };

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

          {/* Cookies / Authentication */}
          <div
            style={{
              padding: '14px',
              background: 'var(--bg-input)',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                <KeyRound size={16} color="var(--palette-copper)" />
                <span>Authentication Cookies (Instagram Stories & YouTube)</span>
              </label>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 10,
                  background: hasCookies ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                  color: hasCookies ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  border: `1px solid ${hasCookies ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                }}
              >
                {hasCookies ? 'Active' : 'No Cookies'}
              </span>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
              Instagram Stories and private reels require logged-in cookies. Use the free browser extension{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Get cookies.txt LOCALLY</strong> in Chrome/Edge/Firefox to export cookies while logged in, then paste or upload below.
            </p>

            {availableBrowsers.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                  fontSize: '0.75rem',
                  color: 'var(--palette-sand)',
                  background: 'rgba(200, 121, 44, 0.1)',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(200, 121, 44, 0.25)',
                }}
              >
                <span>🌐 Auto-sync supported from: <strong>{availableBrowsers.map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(', ')}</strong> (close browser before downloading)</span>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="Paste cookies.txt contents here (Netscape format)..."
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                resize: 'vertical',
                marginBottom: 8,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Upload size={13} />
                  <span>Import .txt File</span>
                  <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                {cookieInput.trim() && (
                  <button
                    type="button"
                    onClick={handleSaveCookies}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    Save Cookies
                  </button>
                )}
              </div>

              {hasCookies && (
                <button
                  type="button"
                  onClick={handleRemoveCookies}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    color: 'var(--accent-rose)',
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Clear Cookies</span>
                </button>
              )}
            </div>

            {cookieStatusMsg && (
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: 8, fontWeight: 500 }}>
                {cookieStatusMsg}
              </p>
            )}
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
