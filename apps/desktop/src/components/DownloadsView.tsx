import React, { useState, useMemo } from 'react';
import { DownloadRecord } from '@clipnest/shared';
import { DownloadItem } from './DownloadItem.js';
import {
  DownloadCloud,
  Search,
  Trash2,
  FolderOpen,
} from 'lucide-react';

interface DownloadsViewProps {
  downloads: DownloadRecord[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onNavigateToInspector: () => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloads,
  onRetry,
  onRemove,
  onClearCompleted,
  onNavigateToInspector,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDownloads = useMemo(() => {
    return downloads.filter((item) => {
      // Status filter
      if (filterStatus === 'active' && item.status !== 'downloading') return false;
      if (filterStatus === 'completed' && item.status !== 'completed') return false;
      if (filterStatus === 'failed' && item.status !== 'failed') return false;

      // Text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.displayName.toLowerCase().includes(query);
        const matchesHost = item.sourceHost.toLowerCase().includes(query);
        return matchesName || matchesHost;
      }

      return true;
    });
  }, [downloads, filterStatus, searchQuery]);

  const activeCount = downloads.filter((d) => d.status === 'downloading').length;
  const completedCount = downloads.filter((d) => d.status === 'completed').length;
  const failedCount = downloads.filter((d) => d.status === 'failed').length;

  return (
    <div className="downloads-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '16px 8px' }}>
      {/* Title & Toolbar */}
      <div className="downloads-header-row">
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Downloads Library
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manage active tasks and browse local download history
          </p>
        </div>

        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <Trash2 size={15} color="var(--accent-rose)" />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="downloads-filter-bar">
        <div className="downloads-filters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: filterStatus === 'all' ? 'var(--gradient-brand)' : 'var(--bg-input)',
              color: filterStatus === 'all' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All ({downloads.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: filterStatus === 'active' ? 'var(--gradient-brand)' : 'var(--bg-input)',
              color: filterStatus === 'active' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: filterStatus === 'completed' ? 'var(--gradient-brand)' : 'var(--bg-input)',
              color: filterStatus === 'completed' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Completed ({completedCount})
          </button>
          {failedCount > 0 && (
            <button
              onClick={() => setFilterStatus('failed')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: filterStatus === 'failed' ? 'var(--accent-rose)' : 'var(--bg-input)',
                color: filterStatus === 'failed' ? '#ffffff' : 'var(--accent-rose)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Failed ({failedCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div
          className="downloads-search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '6px 12px',
          }}
        >
          <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              width: 160,
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Downloads List */}
      {filteredDownloads.length > 0 ? (
        <div>
          {filteredDownloads.map((record) => (
            <DownloadItem
              key={record.id}
              record={record}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="glass-panel"
          style={{
            padding: '50px 32px',
            textAlign: 'center',
            borderRadius: 16,
            marginTop: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(200, 121, 44, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <DownloadCloud size={28} color="var(--accent-cyan)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 6 }}>
            {searchQuery ? 'No matching downloads found' : 'No downloads yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 420, margin: '0 auto 20px' }}>
            {searchQuery
              ? 'Try adjusting your search query or clear the filter.'
              : 'Paste and analyze a direct media link to start saving files to your local machine.'}
          </p>
          {!searchQuery && (
            <button onClick={onNavigateToInspector} className="btn-primary" style={{ padding: '8px 20px' }}>
              Inspect a Link
            </button>
          )}
        </div>
      )}
    </div>
  );
};
