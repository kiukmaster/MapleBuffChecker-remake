'use client';

import { useEffect, useState } from 'react';
import { fetchPatchNotes, isFresh } from '@/lib/patchnotes';

export default function UpdatePage() {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    fetchPatchNotes().then(setNotes);
  }, []);

  return (
    <main className="page update">
      <header className="u-head">
        <h1>패치노트</h1>
        <p className="muted">업데이트 내역을 정리해 둡니다.</p>
      </header>

      {notes === null && <div className="u-empty">불러오는 중…</div>}
      {notes !== null && notes.length === 0 && <div className="u-empty">아직 등록된 패치노트가 없습니다.</div>}

      <div className="u-list">
        {(notes || []).map((n, i) => (
          <article key={i} className="u-item">
            <div className="u-meta">
              <time>{n.date}</time>
              {isFresh(n.date) && <span className="u-new">New!</span>}
            </div>
            {n.title && <h2>{n.title}</h2>}
            <ul>
              {(n.items || []).map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <style jsx>{`
        .update { max-width: 760px; }
        .u-head { margin-bottom: 28px; }
        .u-head h1 { font-size: 26px; font-weight: 790; letter-spacing: -0.025em; }
        .u-head p { font-size: 14px; margin-top: 6px; }
        .u-empty { color: var(--text-faint); font-size: 14px; padding: 20px; border: 1px dashed var(--border); border-radius: var(--radius-sm); }

        /* 좌측 타임라인 라인 + 노드 */
        .u-list { display: flex; flex-direction: column; gap: 14px; position: relative; padding-left: 22px; }
        .u-list::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 2px; background: var(--border); }
        .u-item { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; transition: border-color .15s; }
        .u-item:hover { border-color: var(--border-strong); }
        .u-item::before {
          content: ''; position: absolute; left: -22px; top: 24px; width: 10px; height: 10px;
          border-radius: 50%; background: var(--surface-3); border: 2px solid var(--bg);
        }
        .u-item:first-child::before { background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
        .u-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .u-meta time { font-family: var(--mono); font-size: 13px; color: var(--text-muted); }
        .u-new { font-size: 11px; font-weight: 800; color: #fff; background: #e5484d; padding: 1px 7px; border-radius: 999px; }
        .u-item h2 { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
        .u-item ul { padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
        .u-item li { font-size: 14px; color: var(--text-muted); }
      `}</style>
    </main>
  );
}
