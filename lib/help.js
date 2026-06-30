// First-visit help popup state (client-side only).
//  - dismissForever (localStorage): "앞으로 보지않기" → never auto-show again.
//  - ackSession (sessionStorage): "이해했습니다!" → hide for this session only.
const KEY = 'mbc-help-dismissed';
const SKEY = 'mbc-help-ack-session';

export function isHelpSuppressed() {
  try {
    return !!localStorage.getItem(KEY) || !!sessionStorage.getItem(SKEY);
  } catch {
    return false;
  }
}
export function ackHelp() {
  try { sessionStorage.setItem(SKEY, '1'); } catch {}
}
export function dismissHelpForever() {
  try { localStorage.setItem(KEY, '1'); } catch {}
}
export function resetHelp() {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(SKEY); } catch {}
}
