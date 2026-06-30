'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// The PiP window is a separate document with no access to our CSS variables,
// so its styles are inlined here with literal colours (matching the theme).
const PIP_CSS = `
  html, body { margin: 0; height: 100%; }
  body { background: #1b1c1f; color: #eef0ee; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
  .pip-root { height: 100%; }
  .pip { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .pip-label { font-size: 13px; font-weight: 700; color: #9a9ba1; letter-spacing: -0.01em; }
  .pip-num { font-size: 66px; font-weight: 800; line-height: 1; color: #67686e; font-variant-numeric: tabular-nums; }
  .pip.on .pip-num { color: #7cc466; }
  .pip-sub { font-size: 12px; color: #67686e; }
  .pip.on .pip-sub { color: #9a9ba1; }
`;

function PipView({ countdown }) {
  const counting = countdown != null;
  return (
    <div className={'pip' + (counting ? ' on' : '')}>
      <div className="pip-label">일격필살</div>
      <div className="pip-num">{counting ? countdown : '–'}</div>
      <div className="pip-sub">{counting ? '초 남음' : '대기 중'}</div>
    </div>
  );
}

/**
 * Picture-in-Picture window showing the 일격필살 countdown so it stays visible
 * over the game. Uses the Document Picture-in-Picture API (Chrome/Edge 116+);
 * `supported` is false elsewhere. `open()` must be called from a user gesture.
 */
export function useSpecialPip(countdown) {
  const [target, setTarget] = useState(null); // { win, mount }
  const supported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const open = async () => {
    if (!supported || target) return;
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 200, height: 150 });
      const style = win.document.createElement('style');
      style.textContent = PIP_CSS;
      win.document.head.appendChild(style);
      const mount = win.document.createElement('div');
      mount.className = 'pip-root';
      win.document.body.appendChild(mount);
      win.addEventListener('pagehide', () => setTarget(null));
      setTarget({ win, mount });
    } catch { /* user dismissed or unsupported */ }
  };

  const close = () => { try { target?.win.close(); } catch {} setTarget(null); };

  // Close the PiP window if the page unmounts.
  useEffect(() => () => { try { target?.win.close(); } catch {} }, [target]);

  const node = target ? createPortal(<PipView countdown={countdown} />, target.mount) : null;
  return { supported, active: !!target, open, close, node };
}
