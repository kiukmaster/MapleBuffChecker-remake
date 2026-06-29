// ─────────────────────────────────────────────────────────────────────────
// Skill catalog — pure domain data.
//
// This is intentionally declarative: every behavioural quirk of a skill is
// expressed as data (an `alert` descriptor, a template pattern, etc.) so the
// detection engine and UI can stay generic. Nothing here imports React or the
// matcher; it is just a description of "what to watch for and how to react".
// ─────────────────────────────────────────────────────────────────────────

export const RESOLUTIONS = [
  { value: '1366x768', label: '1366 × 768' },
  { value: '1920x1080', label: '1920 × 1080' },
  { value: '2560x1440', label: '2560 × 1440' },
];

// Remaining-duration choices for skills whose template differs per remaining time.
export const DURATIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'hunting', label: '사냥' },
  { id: 'boss', label: '보스' },
  { id: 'job', label: '직업' },
];

// Shared alarm clips offered for every skill in addition to its own voice line.
const ALARMS = {
  뚜루루루룬: '/sound/뚜루루루룬.wav',
  '띠-링': '/sound/띠-링.wav',
  뚜두둥: '/sound/뚜두둥.wav',
};

// Build a sound map whose first (default) entry is the skill's own voice line.
const withAlarms = (entries) => ({ ...entries, ...ALARMS });

// Alert descriptors ───────────────────────────────────────────────────────
//
//  instant            : fire once when the match first crosses the threshold,
//                       re-arm once it drops back below.
//  instant+cooldownMs : same, but never fire more often than cooldownMs.
//  delayed(delayMs)   : when first detected, wait delayMs then fire once.
//                       Brief flicker below threshold during the wait must NOT
//                       cancel or restart the timer.
//  timer(...)         : detection starts a countdown; the alarm fires `leadSec`
//                       seconds before it ends. Re-detections inside ignoreMs
//                       are ignored so one cast can't retrigger the countdown.
const instant = (cooldownMs = 0) => ({ mode: 'instant', cooldownMs });
const delayed = (delayMs) => ({ mode: 'delayed', delayMs });

export const SKILLS = [
  // ── 사냥 (hunting) ──────────────────────────────────────────────────────
  {
    id: 'erda', name: '파운틴', category: 'hunting',
    template: '/detect/erda/erda_{res}_{dur}sec.png', durationSelect: true, defaultDuration: 5,
    threshold: 0.92, icon: '/detect/erda/erda_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/파운틴.wav' }),
    alert: instant(3000),
  },
  {
    id: 'janus', name: '야누스', category: 'hunting',
    template: '/detect/janus/janus_{res}_{dur}sec.png', durationSelect: true, defaultDuration: 5,
    threshold: 0.92, icon: '/detect/janus/janus_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/야누스.wav' }),
    alert: instant(3000),
  },
  {
    id: 'unionLuck', name: '유행[3단계]', category: 'hunting',
    template: '/detect/union/unionLuck_{res}.png', threshold: 0.88, icon: '/detect/union/unionLuck.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/unionLuck.wav' }),
    alert: instant(),
  },
  {
    id: 'unionMoney', name: '유부[3단계]', category: 'hunting',
    template: '/detect/union/unionMoney_{res}.png', threshold: 0.88, icon: '/detect/union/unionMoney.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/unionMoney.wav' }),
    alert: instant(),
  },
  {
    id: 'extremegold', name: '익골[도핑]', category: 'hunting',
    template: '/detect/익스트림골드_{res}.png', threshold: 0.88, icon: '/detect/익스트림골드_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/익스트림골드.wav' }),
    alert: instant(),
  },
  {
    id: 'sojaebi', name: '소재비[도핑]', category: 'hunting',
    template: '/detect/소재비_{res}.png', threshold: 0.88, icon: '/detect/소재비_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/소재비.wav' }),
    alert: instant(),
  },

  // ── 보스 (boss) ─────────────────────────────────────────────────────────
  {
    id: 'special', name: '일격필살', category: 'boss',
    template: '/detect/special_{res}.png', threshold: 0.91, icon: '/detect/special_icon.png',
    sounds: withAlarms({ '기본음성(5초전)': '/sound/detect/일필5초.wav', '10초전음성': '/sound/detect/일필10초.wav' }),
    alert: { mode: 'timer', countdownSec: 30, ignoreMs: 10000, defaultLeadSec: 5, leadOptions: [5, 10] },
  },
  {
    id: 'Alleria', name: '알레리아', category: 'boss',
    template: '/detect/Alleria_{res}.png', threshold: 0.65, icon: '/detect/Alleria_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/알레리아.wav' }),
    alert: instant(), exclusiveWith: ['heavensdoor'],
  },
  {
    id: 'heavensdoor', name: '헤도(연모)', category: 'boss',
    template: '/detect/heavens_door_{res}.png', threshold: 0.65, icon: '/detect/heavensdoor_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/헤도.wav' }),
    alert: instant(), exclusiveWith: ['Alleria'],
  },

  // ── 직업 (job) ──────────────────────────────────────────────────────────
  {
    id: 'freud', name: '프리드', category: 'job',
    template: '/detect/freud_{res}.png', threshold: 0.88, icon: '/detect/freud_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/프리드.wav' }),
    alert: instant(),
  },
  {
    id: 'Altar', name: '블랙 매직 알터', category: 'job',
    template: '/detect/알터_{res}.png', threshold: 0.88, icon: '/detect/알터_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/알터.wav' }),
    alert: instant(),
  },
  {
    id: 'marker', name: '마커', category: 'job',
    template: '/detect/마커_{res}.png', threshold: 0.88, icon: '/detect/마커_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/마커.wav' }),
    alert: instant(),
  },
  {
    id: 'awaken', name: '초각성', category: 'job',
    template: '/detect/초각성_{res}.png', threshold: 0.88, icon: '/detect/초각성_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/초각성.wav' }),
    alert: instant(),
  },
  {
    id: 'secretscrolls', name: '비전서', category: 'job',
    template: '/detect/비전서_{res}.png', threshold: 0.88, icon: '/detect/비전서_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/비전서.wav' }),
    alert: instant(),
  },
  {
    id: 'releaseoverload', name: '릴리즈 오버로드', category: 'job',
    template: '/detect/릴리즈오버로드_{res}.png', threshold: 0.88, icon: '/detect/릴리즈오버로드_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/릴리즈오버로드.wav' }),
    alert: instant(),
  },
  {
    id: 'arrowrain', name: '애로우 레인', category: 'job',
    template: '/detect/애로우레인_{res}.png', threshold: 0.88, icon: '/detect/애로우레인_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/애로우레인.wav' }),
    alert: instant(),
  },
  {
    id: 'quiverfullburst', name: '퀴버 풀버스트', category: 'job',
    template: '/detect/퀴버풀버스트_{res}.png', threshold: 0.88, icon: '/detect/퀴버풀버스트_icon.png',
    sounds: withAlarms({ 기본음성: '/sound/detect/퀴버풀버스트.wav' }),
    alert: instant(),
  },
  {
    // 마력[레테] — fires 5s after first detection (delayed alarm), with flicker
    // protection so a momentary dip below threshold doesn't restart the timer.
    id: 'letheMana', name: '마력[레테]', category: 'job',
    template: '/detect/lethe/마력감지_{res}.png', threshold: 0.93, icon: '/detect/lethe/팩트매니페스트.png',
    sounds: withAlarms({ 기본음성: '/sound/소환수감지.wav' }),
    alert: delayed(5000),
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// Resolve the template image URL for the chosen resolution / remaining-duration.
export function templateUrl(skill, resolution, duration) {
  let url = skill.template.replace('{res}', resolution);
  if (skill.durationSelect) {
    url = url.replace('{dur}', String(duration ?? skill.defaultDuration ?? DURATIONS[0]));
  }
  return url;
}
