'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchPatchNotes, hasFreshNote } from '@/lib/patchnotes';

const LINKS = [
  { href: '/', label: '홈' },
  { href: '/detect', label: '스킬 감지' },
  { href: '/update', label: '패치노트' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    fetchPatchNotes().then((notes) => setFresh(hasFreshNote(notes)));
  }, []);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="mark" />
          버프체커
        </Link>
        <div className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={'link' + (pathname === l.href ? ' active' : '')}>
              {l.label}
              {l.href === '/update' && fresh && <span className="new">New!</span>}
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(31, 31, 34, 0.8);
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
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: -0.01em;
        }
        .mark {
          width: 14px;
          height: 14px;
          border-radius: 5px;
          background: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }
        .links {
          display: flex;
          gap: 4px;
        }
        .link {
          position: relative;
          padding: 7px 14px;
          border-radius: var(--radius-pill);
          font-size: 14px;
          color: var(--text-muted);
          transition: background 0.15s, color 0.15s;
        }
        .new {
          position: absolute;
          top: -3px;
          right: -2px;
          font-size: 9px;
          font-weight: 700;
          line-height: 1;
          color: #ff5b5b;
          letter-spacing: -0.02em;
          pointer-events: none;
        }
        .link:hover {
          color: var(--text);
          background: var(--surface);
        }
        .link.active {
          color: var(--text);
          background: var(--surface-2);
        }
      `}</style>
    </nav>
  );
}
