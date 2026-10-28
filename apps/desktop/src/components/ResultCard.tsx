import React, { useState } from 'react';
import {
  LinkInspectionResult,
  formatBytes,
} from '@clipnest/shared';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Download,
  Copy,
  Check,
  Shield,
  FileVideo,
  Globe,
} from 'lucide-react';

interface ResultCardProps {
  result: LinkInspectionResult;
  onDownload: (result: LinkInspectionResult) => void;
  isDownloadingAlready?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onDownload,
  isDownloadingAlready,
}) => {
  const [userConfirmedRights, setUserConfirmedRights] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDirectDownload = result.status === 'direct_download_available';
  const isOfficialAction = result.status === 'official_action_available';

  const getStatusBadge = () => {
    switch (result.status) {
      case 'direct_download_available':
        return <span className="badge badge-emerald">Direct Download Available</span>;
      case 'official_action_available':
        return <span className="badge badge-indigo">Official Action Only</span>;
      case 'permission_required':
        return <span className="badge badge-rose">Permission / Login Required</span>;
      case 'temporarily_unavailable':
        return <span className="badge badge-amber">Temporarily Unavailable</span>;
      case 'invalid_link':
        return <span className="badge badge-rose">Invalid Link</span>;
      default:
        return <span className="badge badge-slate">Unsupported Source</span>;
    }
  };

  return (
    <div className="glass-panel fade-in result-card">
      {/* Header Row */}
      <div
        className="result-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 18,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            {isDirectDownload ? (
              <FileVideo size={20} color="var(--accent-emerald)" />
            ) : (
              <Globe size={20} color="var(--accent-cyan)" />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
              }}
            >
              {result.title || result.displayHost}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Source Host: <strong style={{ color: 'var(--text-secondary)' }}>{result.displayHost}</strong>
            </span>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Metadata Grid */}
      <div
        className="result-meta-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          margin: '20px 0',
        }}
      >
        <div
          style={{
            background: 'var(--bg-input)',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
            Platform / Type
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {result.platform.replace('_', ' ')}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-input)',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
            Media MIME
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {result.mediaType || 'Web Page (HTML)'}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-input)',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
            Estimated Size
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {result.sizeBytes ? formatBytes(result.sizeBytes) : 'Dynamic / Stream'}
          </span>
        </div>
      </div>

      {/* Guidance / Explanation Banner */}
      <div
        style={{
          background: isDirectDownload
            ? 'rgba(16, 185, 129, 0.08)'
            : isOfficialAction
            ? 'rgba(200, 121, 44, 0.12)'
            : 'rgba(91, 70, 50, 0.15)',
          border: `1px solid ${
            isDirectDownload
              ? 'rgba(16, 185, 129, 0.25)'
              : isOfficialAction
              ? 'rgba(200, 121, 44, 0.35)'
              : 'rgba(91, 70, 50, 0.25)'
          }`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {isDirectDownload ? (
            <CheckCircle2 size={20} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : isOfficialAction ? (
            <Info size={20} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
          )}

          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 4 }}>
              {isDirectDownload
                ? 'Authorized Direct Stream'
                : isOfficialAction
                ? 'Platform Content Notice'
                : 'Notice Regarding This Link'}
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {result.message}
            </p>
            {result.officialGuidance?.policyNotes && (
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginTop: 6,
                  fontStyle: 'italic',
                }}
              >
                Policy: {result.officialGuidance.policyNotes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {isDirectDownload && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="confirmRights"
              checked={userConfirmedRights}
              onChange={(e) => setUserConfirmedRights(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
            <label
              htmlFor="confirmRights"
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              I verify that I have authorization or public distribution rights to save this file.
            </label>
          </div>
        )}

        <div className="result-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="result-actions-left" style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCopy} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
              {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <ExternalLink size={16} />
              <span>
                {result.officialGuidance?.suggestedActionLabel || 'Open Source Page'}
              </span>
            </a>
          </div>

          <div className="result-actions-right">
            <button
              onClick={() => {
                const downloadResult = {
                  ...result,
                  directMediaUrl:
                    result.directMediaUrl ||
                    `http://${window.location.hostname}:4000/api/v1/download/stream?url=${encodeURIComponent(result.url)}&title=${encodeURIComponent(result.title || 'media')}`,
                };
                onDownload(downloadResult);
              }}
              disabled={isDownloadingAlready}
              className="btn-primary btn-download-action"
              style={{ padding: '10px 24px' }}
            >
              <Download size={18} />
              <span>{isDownloadingAlready ? 'Download In Progress' : 'Download Media File'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
