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
  useEffect(() => { fetchPatchNotes().then((notes) => setFresh(hasFreshNote(notes))); }, []);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="MapleBuffChecker 홈">
          <span className="mark"><span className="ring" /></span>
          <span className="brand-text"><span>Maple</span><span className="hl">BuffChecker</span></span>
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
          position: sticky; top: 0; z-index: 50;
          background: rgba(27, 28, 31, 0.82);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          max-width: 1180px; margin: 0 auto; height: 58px; padding: 0 24px;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* 브랜드 — 펄스 링 마크 */
        .brand { display: flex; align-items: center; gap: 10px; }
        .mark {
          position: relative; width: 14px; height: 14px; border-radius: 50%;
          background: var(--accent); display: inline-flex;
        }
        .mark .ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid var(--accent);
          animation: mbcRing 2.2s ease-out infinite;
        }
        .brand-text { font-size: 17px; font-weight: 780; letter-spacing: -0.02em; color: var(--text); }
        .brand-text .hl { color: var(--accent); }

        /* 탭 컨테이너 (탭 자체는 next/link라 아래 global 블록에서 처리) */
        .tabs { display: flex; gap: 4px; align-items: center; }
        @media (max-width: 560px) {
          .nav-inner { padding: 0 14px; }
          .brand-text { font-size: 15px; }
        }
      `}</style>

      {/* 탭은 next/link(<a>)이고 className이 표현식이라 styled-jsx 스코프가 붙지
          않는다. .nav 한정 global 로 적용한다(다른 페이지의 .tab 과 충돌 방지). */}
      <style jsx global>{`
        .nav .tab {
          position: relative; padding: 7px 15px; border-radius: var(--radius-pill);
          font-size: 13.5px; font-weight: 600; color: var(--text-muted);
          border: 1px solid transparent; white-space: nowrap; transition: all 0.15s;
        }
        .nav .tab.has-new { padding-right: 17px; }
        .nav .tab:hover { color: var(--text); background: var(--surface); }
        .nav .tab.active { color: var(--text); background: var(--surface-2); border-color: var(--border-strong); }
        .nav .new {
          position: absolute; top: -6px; right: 1px;
          font-size: 9px; font-weight: 800; line-height: 1; color: #ff5b5b;
          letter-spacing: -0.02em; pointer-events: none;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
        }
        @media (max-width: 560px) { .nav .tab { padding: 7px 11px; font-size: 13px; } }
      `}</style>
    </nav>
  );
}
