import React, { useState } from 'react';
import { Link2, Clipboard, X, Search, Loader2 } from 'lucide-react';

interface UrlInspectorCardProps {
  url: string;
  onChangeUrl: (val: string) => void;
  onInspect: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const SAMPLE_LINKS = [
  {
    label: 'Direct MP4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'direct',
  },
  {
    label: 'Direct WebM',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
    type: 'direct',
  },
  {
    label: 'YouTube (Honest Policy)',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'platform',
  },
  {
    label: 'Instagram (Honest Policy)',
    url: 'https://www.instagram.com/reel/DAExampleLink/',
    type: 'platform',
  },
  {
    label: 'Vimeo Video',
    url: 'https://vimeo.com/76979871',
    type: 'platform',
  },
];

export const UrlInspectorCard: React.FC<UrlInspectorCardProps> = ({
  url,
  onChangeUrl,
  onInspect,
  isLoading,
  errorMessage,
}) => {
  const [pasteToast, setPasteToast] = useState(false);

  const handlePaste = async () => {
    try {
      let text = '';
      if (window.electronAPI?.readClipboard) {
        text = await window.electronAPI.readClipboard();
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text) {
        onChangeUrl(text.trim());
        setPasteToast(true);
        setTimeout(() => setPasteToast(false), 1500);
      }
    } catch (err) {
      console.warn('Clipboard read error', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onInspect();
    }
  };

  return (
    <div
      className="glass-panel pulse-glow inspector-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2
          className="inspector-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.85rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Inspect & Manage Any Media Link
        </h2>
        <p className="inspector-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Paste a media URL to evaluate platform rules, verify direct stream availability, and download authorized files.
        </p>
      </div>

      {/* Input Bar */}
      <div className="url-input-container">
        <div className="url-input-row">
          <Link2 size={20} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />

          <input
            type="text"
            value={url}
            onChange={(e) => onChangeUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste URL here (e.g. YouTube, direct video link)..."
            disabled={isLoading}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.96rem',
              fontFamily: 'var(--font-body)',
            }}
          />

          {url && (
            <button
              onClick={() => onChangeUrl('')}
              title="Clear URL"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="url-actions-row">
          <button
            onClick={handlePaste}
            title="Paste from clipboard"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Clipboard size={15} />
            <span>{pasteToast ? 'Pasted!' : 'Paste'}</span>
          </button>

          <button
            onClick={onInspect}
            disabled={!url.trim() || isLoading}
            className="btn-primary"
            style={{ padding: '9px 20px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search size={17} />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          className="fade-in"
          style={{
            marginTop: 14,
            padding: '10px 16px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 10,
            color: 'var(--accent-rose)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sample Links Quick Selector */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          Test Quick Samples:
        </span>
        {SAMPLE_LINKS.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              onChangeUrl(sample.url);
            }}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: '0.78rem',
              color: sample.type === 'direct' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
