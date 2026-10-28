import React, { useState } from 'react';
import { DownloadRecord, formatBytes } from '@clipnest/shared';
import {
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Play,
  FolderOpen,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

interface DownloadItemProps {
  record: DownloadRecord;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export const DownloadItem: React.FC<DownloadItemProps> = ({
  record,
  onRetry,
  onRemove,
}) => {
  const [copied, setCopied] = useState(false);
  const isElectron = Boolean(window.electronAPI?.isElectron);

  const handleCopy = () => {
    navigator.clipboard.writeText(record.downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFile = async () => {
    if (record.localPath && window.electronAPI?.openPath) {
      await window.electronAPI.openPath(record.localPath);
    }
  };

  const handleShowInFolder = async () => {
    if (record.localPath && window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(record.localPath);
    }
  };

  const isDownloading = record.status === 'downloading';
  const isCompleted = record.status === 'completed';
  const isFailed = record.status === 'failed';

  return (
    <div
      className="glass-panel download-item-card"
      style={{
        marginBottom: 12,
        transition: 'all 0.2s ease',
      }}
    >
      <div className="download-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Left: Icon and Title */}
        <div className="download-item-main" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isCompleted
                ? 'rgba(16, 185, 129, 0.15)'
                : isFailed
                ? 'rgba(244, 63, 94, 0.15)'
                : 'rgba(200, 121, 44, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isCompleted ? (
              <CheckCircle2 size={24} color="var(--accent-emerald)" />
            ) : isFailed ? (
              <AlertCircle size={24} color="var(--accent-rose)" />
            ) : (
              <FileVideo size={24} color="var(--accent-cyan)" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontSize: '0.96rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={record.displayName}
            >
              {record.displayName}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {record.sourceHost}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {record.sizeBytes ? formatBytes(record.sizeBytes) : formatBytes(record.downloadedBytes)}
              </span>
              {record.completedAt && (
                <>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(record.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="download-item-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isDownloading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)', fontSize: '0.84rem', fontWeight: 600 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{record.progressPercent}%</span>
            </div>
          )}

          {isCompleted && isElectron && record.localPath && (
            <>
              <button
                onClick={handleOpenFile}
                title="Play in default player"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <Play size={14} color="var(--accent-emerald)" />
                <span>Play</span>
              </button>
              <button
                onClick={handleShowInFolder}
                title="Show in folder"
                className="btn-secondary"
                style={{ padding: '6px 10px' }}
              >
                <FolderOpen size={15} color="var(--accent-cyan)" />
              </button>
            </>
          )}

          {isFailed && (
            <button
              onClick={() => onRetry(record.id)}
              title="Retry Download"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: 'rgba(244, 63, 94, 0.4)' }}
            >
              <RotateCw size={14} color="var(--accent-rose)" />
              <span>Retry</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy download URL"
            className="btn-secondary"
            style={{ padding: '6px 8px' }}
          >
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          </button>

          <button
            onClick={() => onRemove(record.id)}
            title="Remove from history"
            className="btn-secondary"
            style={{ padding: '6px 8px', color: 'var(--accent-rose)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar when downloading */}
      {isDownloading && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${record.progressPercent}%`,
                height: '100%',
                background: 'var(--gradient-brand)',
                borderRadius: 3,
                transition: 'width 0.2s linear',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {formatBytes(record.downloadedBytes)} of {record.sizeBytes ? formatBytes(record.sizeBytes) : 'unknown'}
            </span>
            {record.speedBytesPerSec !== undefined && record.speedBytesPerSec > 0 && (
              <span>{formatBytes(record.speedBytesPerSec)}/s</span>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {isFailed && record.errorMessage && (
        <div
          style={{
            marginTop: 10,
            padding: '6px 12px',
            background: 'rgba(244, 63, 94, 0.1)',
            borderRadius: 8,
            color: 'var(--accent-rose)',
            fontSize: '0.78rem',
          }}
        >
          {record.errorMessage}
        </div>
      )}
    </div>
  );
};
