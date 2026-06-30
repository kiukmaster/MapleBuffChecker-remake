'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isHelpSuppressed, ackHelp, dismissHelpForever, resetHelp } from '@/lib/help';
import HelpContent from './HelpContent';

/**
 * Help-popup state. First-time visitors (no dismiss/ack flag) see the modal
 * automatically. `ack` hides it for the session; `dismissForever` never shows
 * it again; `show` opens it manually; `resetAndShow` re-enables the auto-popup.
 */
export function useHelp() {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!isHelpSuppressed()) setOpen(true); }, []);
  return {
    open,
    show: () => setOpen(true),
    ack: () => { ackHelp(); setOpen(false); },
    dismissForever: () => { dismissHelpForever(); setOpen(false); },
    resetAndShow: () => { resetHelp(); setOpen(true); },
  };
}

export default function HelpModal({ open, onAck, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock background scroll while the modal is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="help-backdrop" role="dialog" aria-modal="true">
      <div className="help-card">
        <div className="help-scroll">
          <HelpContent />
        </div>
        <div className="help-actions">
          <button className="hbtn dim" onClick={onDismiss}>앞으로 보지않기</button>
          <button className="hbtn ok" onClick={onAck}>이해했습니다!</button>
        </div>
      </div>

      <style jsx>{`
        .help-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
          /* 어렴풋이 뒤가 보이게 — 살짝만 흐리고 어둡게 */
          background: rgba(18, 19, 21, 0.45);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          animation: helpFade 0.18s ease-out;
        }
        @keyframes helpFade { from { opacity: 0; } to { opacity: 1; } }
        .help-card {
          width: 100%; max-width: 560px; max-height: 85vh;
          display: flex; flex-direction: column;
          background: var(--surface); border: 1px solid var(--border-strong);
          border-radius: var(--radius); box-shadow: var(--shadow);
          animation: helpPop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes helpPop { from { transform: translateY(8px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
        .help-scroll { overflow-y: auto; padding: 24px; }
        .help-actions {
          display: flex; gap: 10px; padding: 14px 18px;
          border-top: 1px solid var(--border); flex-shrink: 0;
        }
        .hbtn {
          flex: 1; padding: 12px 16px; border-radius: 11px; font-size: 14px; font-weight: 700;
          border: 1px solid transparent; transition: all 0.15s;
        }
        .hbtn.ok { background: var(--accent); color: var(--on-accent); }
        .hbtn.ok:hover { background: var(--accent-hover); }
        .hbtn.dim { background: var(--surface-2); color: var(--text-muted); border-color: var(--border-strong); flex: 0 0 auto; padding: 12px 18px; }
        .hbtn.dim:hover { color: var(--text); background: var(--surface-3); }
      `}</style>
    </div>,
    document.body,
  );
}
