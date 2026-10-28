import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  EyeOff,
  Cpu,
} from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel fade-in modal-dialog" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} color="var(--accent-emerald)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
              OneClick Ethical Policy & Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p style={{ lineHeight: 1.5 }}>
            OneClick is an honest, production-minded link utility. Unlike traditional ad-laden converters, OneClick does not fabricate fake quality options or violate platform intellectual property.
          </p>

          {/* Platform Matrix */}
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 12 }}>
              Platform Support & Behavior Matrix
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Direct Media Files (.mp4, .webm, .mkv, .mov):</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Full native chunked download to local disk with streaming progress when the user is authorized.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} color="var(--accent-indigo)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>YouTube:</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    No unofficial stream extraction. Shows official YouTube Premium offline save or YouTube Studio export routes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} color="var(--accent-indigo)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Instagram & Facebook:</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Does not harvest private media. Recommends native In-App Bookmarking or Meta account export.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} color="var(--accent-indigo)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Vimeo:</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Guides users to creator-enabled official download buttons directly on Vimeo.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Security Guarantees */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--text-primary)', fontWeight: 600 }}>
                <EyeOff size={16} color="var(--accent-cyan)" />
                <span>Zero Tracking</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No telemetry or tracking scripts. Download history remains 100% on your local machine.
              </p>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--text-primary)', fontWeight: 600 }}>
                <Lock size={16} color="var(--accent-emerald)" />
                <span>No Credential Harvesting</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                We never prompt for or store passwords, cookies, or social media tokens.
              </p>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--text-primary)', fontWeight: 600 }}>
                <Cpu size={16} color="var(--accent-purple)" />
                <span>Direct Client-Side Downloads</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Direct media streams write straight to your disk without proxying video bytes through cloud servers.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button onClick={onClose} className="btn-primary" style={{ padding: '8px 24px' }}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
