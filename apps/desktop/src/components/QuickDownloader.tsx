import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  DownloadCloud,
  Link2,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { inspectLink } from '../services/api-client.js';
import { LinkInspectionResult } from '@clipnest/shared';

export const QuickDownloader: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [compressVideo, setCompressVideo] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'downloading' | 'completed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadedTitle, setDownloadedTitle] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global paste handler: user can simply press Ctrl+V anywhere on screen
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing elsewhere
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target !== inputRef.current) return;

      const pastedText = e.clipboardData?.getData('text') || '';
      if (pastedText.trim().startsWith('http://') || pastedText.trim().startsWith('https://')) {
        handleProcessUrl(pastedText.trim());
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [compressVideo]);

  // Main automatic process & download pipeline
  const handleProcessUrl = async (inputUrl: string) => {
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl) return;

    setUrl(cleanUrl);
    setStatus('analyzing');
    setStatusMessage('Analyzing and extracting video stream...');
    setDownloadedTitle('');

    try {
      const res: LinkInspectionResult = await inspectLink(cleanUrl);

      if (res.status === 'invalid_link') {
        setStatus('error');
        setStatusMessage(res.message || 'The provided link is not a valid URL.');
        return;
      }

      // Check if direct download or extracted stream is available, or construct universal stream URL
      let streamUrl = res.directMediaUrl || (res.status === 'direct_download_available' ? res.url : null);
      if (!streamUrl && cleanUrl) {
        streamUrl = `http://${window.location.hostname}:4000/api/v1/download/stream?url=${encodeURIComponent(cleanUrl)}&title=${encodeURIComponent(res.title || 'video')}`;
      }

      if (streamUrl) {
        setStatus('downloading');
        const title = res.title || 'video';
        setDownloadedTitle(title);
        setStatusMessage(
          compressVideo
            ? 'Compressing stream & downloading to Gallery...'
            : 'Downloading video directly to Gallery...'
        );

        // Dynamically fix hostname for phone/WiFi access, Cloudflare Tunnels, or remote backend
        let finalDownloadUrl = streamUrl;
        if (finalDownloadUrl.includes('/api/v1/download/stream')) {
          try {
            const rawApi = (import.meta.env.VITE_API_URL as string) || '';
            if (rawApi) {
              const base = rawApi.replace(/\/$/, '');
              const parsed = new URL(finalDownloadUrl);
              finalDownloadUrl = `${base}${parsed.pathname}${parsed.search}`;
            } else if (window.location.protocol === 'https:' || window.location.port === '5173') {
              const parsed = new URL(finalDownloadUrl);
              finalDownloadUrl = `${parsed.pathname}${parsed.search}`;
            } else {
              const parsed = new URL(finalDownloadUrl);
              parsed.hostname = window.location.hostname;
              parsed.port = '4000';
              finalDownloadUrl = parsed.toString();
            }
          } catch {
            // retain finalDownloadUrl
          }
        }

        // Append compression parameter to stream URL if enabled
        if (compressVideo && finalDownloadUrl.includes('/api/v1/download/stream')) {
          finalDownloadUrl += '&compress=true';
        }

        // Trigger automatic native / gallery download
        triggerBrowserDownload(finalDownloadUrl, title, compressVideo);

        // Mark as completed
        setTimeout(() => {
          setStatus('completed');
          setStatusMessage(
            compressVideo
              ? 'Successfully compressed & saved to your Gallery!'
              : 'Successfully downloaded & saved to your Gallery!'
          );
        }, 1500);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to process link. Please verify the URL and try again.');
    }
  };

  const triggerBrowserDownload = (downloadUrl: string, title: string, isCompressed: boolean) => {
    let cleanName = title.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (isCompressed && !cleanName.includes('compressed')) {
      cleanName += '_compressed';
    }
    if (!/\.(mp4|webm|mkv|mov|m4v)$/i.test(cleanName)) {
      cleanName += '.mp4';
    }

    // Direct browser/phone gallery download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Clipboard Paste button handler
  const handlePasteClick = async () => {
    try {
      let text = '';
      if (window.electronAPI?.readClipboard) {
        text = await window.electronAPI.readClipboard();
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text && text.trim()) {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 1500);
        handleProcessUrl(text.trim());
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedText = e.dataTransfer.getData('text');
    if (droppedText) {
      handleProcessUrl(droppedText.trim());
    }
  };

  const handleReset = () => {
    setUrl('');
    setStatus('idle');
    setStatusMessage('');
    setDownloadedTitle('');
    inputRef.current?.focus();
  };

  return (
    <div style={{ maxWidth: '680px', width: '100%', margin: '14px auto 0', padding: '0 8px' }}>
      {/* Central Drag & Drop + Paste Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="glass-panel downloader-box"
        style={{
          border: isDragging
            ? '2px dashed var(--palette-copper)'
            : '1px solid var(--border-subtle)',
          background: isDragging
            ? 'rgba(91, 70, 50, 0.55)'
            : 'var(--bg-card)',
          boxShadow: isDragging
            ? '0 0 35px rgba(200, 121, 44, 0.45)'
            : 'var(--glass-shadow)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Status States */}
        {status === 'idle' && (
          <div className="fade-in">
            {/* Main Icon */}
            <div
              className="downloader-icon-wrap"
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(200, 121, 44, 0.14)',
                border: '1px solid rgba(200, 121, 44, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 20px rgba(200, 121, 44, 0.2)',
              }}
            >
              <DownloadCloud size={30} color="var(--palette-copper)" />
            </div>

            <h2
              className="downloader-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: 20,
              }}
            >
              Download Anything
            </h2>

            {/* Input Bar with Paste & Download Buttons */}
            <div className="downloader-form" style={{ marginBottom: 16 }}>
              <div className="downloader-input-bar">
                <Link2 size={18} color="var(--palette-copper)" style={{ flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="url"
                  inputMode="url"
                  className="downloader-input-field"
                  placeholder="Paste link here..."
                  value={url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUrl(val);
                    if (val.trim().startsWith('http://') || val.trim().startsWith('https://')) {
                      handleProcessUrl(val.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim()) {
                      handleProcessUrl(url.trim());
                    }
                  }}
                />

                <button
                  onClick={handlePasteClick}
                  className="btn-secondary downloader-paste-btn"
                  title="Paste from clipboard"
                  type="button"
                >
                  <Clipboard size={14} />
                  <span>{copiedToast ? 'Pasted!' : 'Paste'}</span>
                </button>
              </div>

              <button
                onClick={() => url.trim() && handleProcessUrl(url.trim())}
                className="btn-primary downloader-download-btn"
                title="Download media"
                disabled={!url.trim()}
                type="button"
              >
                <Download size={15} />
                <span>Download</span>
              </button>
            </div>

            {/* Sleek Minimal Compression Switch */}
            <button
              onClick={() => setCompressVideo(!compressVideo)}
              className="btn-secondary"
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: compressVideo ? 'rgba(200, 121, 44, 0.2)' : 'transparent',
                borderColor: compressVideo ? 'var(--palette-copper)' : 'var(--border-subtle)',
                color: compressVideo ? 'var(--palette-sand)' : 'var(--text-muted)',
              }}
            >
              <Zap size={13} color={compressVideo ? 'var(--palette-sand)' : 'currentColor'} />
              <span>Compress (480p): {compressVideo ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        )}

        {/* Analyzing / Downloading State */}
        {(status === 'analyzing' || status === 'downloading') && (
          <div className="fade-in" style={{ padding: '20px 0' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(200, 121, 44, 0.16)',
                border: '1.5px solid rgba(200, 121, 44, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Loader2 size={36} color="var(--palette-copper)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {status === 'analyzing' ? 'Analyzing Link...' : 'Downloading to Gallery...'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
              {statusMessage}
            </p>

            {downloadedTitle && (
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--palette-sand)',
                  fontWeight: 600,
                  maxWidth: '85%',
                  margin: '0 auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {downloadedTitle}
              </p>
            )}

            {compressVideo && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--palette-sand)',
                  background: 'rgba(244, 217, 160, 0.14)',
                  padding: '3px 10px',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              >
                <Zap size={12} /> Compression Active
              </span>
            )}
          </div>
        )}

        {/* Completed State */}
        {status === 'completed' && (
          <div className="fade-in" style={{ padding: '20px 0' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 size={38} color="var(--accent-emerald)" />
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Saved to Gallery!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              {downloadedTitle || 'Your video'} has been downloaded to your device.
            </p>

            <button
              onClick={handleReset}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.9rem' }}
            >
              <ArrowRight size={16} />
              <span>Download Another Video</span>
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="fade-in" style={{ padding: '20px 0' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.16)',
                border: '1.5px solid rgba(244, 63, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <AlertCircle size={38} color="var(--accent-rose)" />
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Could Not Download
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                maxWidth: '85%',
                margin: '0 auto 22px',
                lineHeight: 1.5,
              }}
            >
              {statusMessage}
            </p>

            <button
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '9px 20px', fontSize: '0.85rem' }}
            >
              <RotateCcw size={15} />
              <span>Try Another Link</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
