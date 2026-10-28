import React, { useState, useEffect } from 'react';
import { Sparkles, Minus, Square, X } from 'lucide-react';
import { API_BASE_URL } from '../services/api-client.js';

export const Header: React.FC = () => {
  const isElectron = Boolean(window.electronAPI?.isElectron);
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkApi = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (mounted) setIsApiOnline(res.ok);
      } catch {
        try {
          const directRes = await fetch(`http://${window.location.hostname}:4000/api/v1/health`);
          if (mounted) setIsApiOnline(directRes.ok);
        } catch {
          if (mounted) setIsApiOnline(false);
        }
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="header-container" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Electron custom titlebar row if applicable */}
      {isElectron && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 14px',
            background: 'rgba(0,0,0,0.2)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            <span>OneClick</span>
          </div>
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => window.electronAPI?.minimizeWindow()}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '3px 8px', cursor: 'pointer' }}
            >
              <Minus size={13} />
            </button>
            <button
              onClick={() => window.electronAPI?.maximizeWindow()}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '3px 8px', cursor: 'pointer' }}
            >
              <Square size={11} />
            </button>
            <button
              onClick={() => window.electronAPI?.closeWindow()}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', padding: '3px 8px', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Main Minimal Bar */}
      <div
        className="header-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          maxWidth: '860px',
          margin: '0 auto',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="header-brand-logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(200, 121, 44, 0.4)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div>
            <h1
              className="header-brand-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              One<span style={{ color: 'var(--accent-cyan)' }}>Click</span>
            </h1>
          </div>
        </div>

        {/* Status Pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '4px 9px',
            borderRadius: 12,
            background: isApiOnline ? 'rgba(16, 185, 129, 0.14)' : 'rgba(200, 121, 44, 0.14)',
            color: isApiOnline ? 'var(--accent-emerald)' : 'var(--accent-amber)',
            border: `1px solid ${isApiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(200, 121, 44, 0.3)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isApiOnline ? 'var(--accent-emerald)' : 'var(--accent-amber)',
              boxShadow: isApiOnline ? '0 0 6px var(--accent-emerald)' : 'none',
            }}
          />
          {isApiOnline === null ? 'Connecting...' : isApiOnline ? 'Ready' : 'Local'}
        </span>
      </div>
    </header>
  );
};
