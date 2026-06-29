'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchPatchNotes, hasFreshNote } from '@/lib/patchnotes';

const LINKS = [
  { href: '/', label: '홈' },
  { href: '/detect', label: '스킬 감지' },
  { href: '/scheduler', label: '스케줄러' },
  { href: '/update', label: '패치노트' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [fresh, setFresh] = useState(false);

  // Rendered once in the root layout, so this badge state is shared across every
  // page — the "New!" shows on home / detect / anywhere, not only on /update.
  useEffect(() => {
    fetchPatchNotes().then((notes) => setFresh(hasFreshNote(notes)));
  }, []);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="MapleBuffChecker 홈">
          <span className="mark" />
          <span className="brand-text">
            <span>Maple</span><span className="hl">BuffChecker</span>
          </span>
        </Link>

        <div className="tabs">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const showNew = l.href === '/update' && fresh;
            return (
              <Link key={l.href} href={l.href} className={'tab' + (active ? ' active' : '') + (showNew ? ' has-new' : '')}>
                {l.label}
                {showNew && <span className="new">New!</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(31, 31, 34, 0.82);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          height: 58px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* brand */
        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .mark {
          width: 15px;
          height: 15px;
          border-radius: 5px;
          background: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }
        .brand-text {
          font-size: 17px;
          font-weight: 750;
          letter-spacing: -0.02em;
          color: var(--text);
        }
        .brand-text .hl { color: var(--accent); }

        /* tabs — segmented control so the items read as distinct, not space-separated */
        .tabs {
          display: flex;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          padding: 4px;
        }
        .tab {
          position: relative;
          padding: 6px 16px;
          border-radius: var(--radius-pill);
          font-size: 14px;
          font-weight: 550;
          color: var(--text-muted);
          white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .tab.has-new { padding-right: 22px; }
        .tab:hover { color: var(--text); }
        .tab.active {
          color: var(--text);
          background: var(--surface-3);
        }
        .new {
          position: absolute;
          top: 1px;
          right: 4px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
          color: #ff5b5b;
          letter-spacing: -0.02em;
          pointer-events: none;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
        }

        @media (max-width: 520px) {
          .nav-inner { padding: 0 14px; }
          .tab { padding: 6px 11px; }
          .brand-text { font-size: 15px; }
        }
      `}</style>
    </nav>
  );
}
