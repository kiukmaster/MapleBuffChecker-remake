// ─────────────────────────────────────────────────────────────────────────
// SEO config — single source of truth for site URL, names, description and the
// keyword set, reused by the root metadata, per-route metadata, sitemap, robots
// and JSON-LD. Change SITE_URL to the real domain when deploying.
// ─────────────────────────────────────────────────────────────────────────

export const SITE_URL = 'https://maple-buff-checker.vercel.app';
export const SITE_NAME = '메이플 버프 체커';

export const SITE_TITLE =
  '메이플 버프 체커 – 메이플스토리 스킬 감지·버프 타이머 알림';

export const SITE_DESC =
  '메이플 버프 체커는 메이플스토리 설치기·버프 스킬(파운틴·야누스·일격필살·유니온 등)의 ' +
  '재사용 타이밍을 화면에서 실시간으로 감지해 소리로 알려주는 무료 비공식 도우미입니다. ' +
  '화면 공유만으로 가볍게 동작하고, 스킬별 알림음과 감지 정확도를 직접 조절할 수 있습니다.';

// 검색 키워드 — 한국어 게임 검색은 네이버 비중도 커서 메타 키워드도 함께 채운다.
export const KEYWORDS = [
  '메이플', '메이플스토리', '메이플 스토리', 'MapleStory', '메이플 버프', '메이플버프',
  '메이플 버프체커', '메이플 버프 체커', '메이플버프체커', '버프체커', '버프 체커', 'maple buff checker',
  '메이플 감지', '메이플 탐지', '메이플 스킬감지', '메이플 스킬 감지', '메이플 스킬탐지', '메이플 스킬 탐지',
  '메이플 타이머', '메이플 버프 타이머', '메이플 버프타이머', '메이플 쿨타임', '메이플 쿨타임 알림',
  '버프 타이머', '스킬 타이머', '쿨타임 타이머', '타이머', '버프 타이밍', '메이플 버프 타이밍',
  '메이플 알림', '메이플 알리미', '메이플 버프 알림', '메이플 도우미', '메이플 버프 도우미',
  '설치기 알림', '설치기 타이머', '설치기 감지', '메이플 설치기',
  '파운틴', '에르다 분수', '야누스', '솔 야누스', '소울 야누스', '일격필살', '유니온', '유니온 버프',
  '익스트림 골드', '익골', '비전서', '마커', '초각성', '릴리즈 오버로드', '애로우 레인', '퀴버 풀버스트',
  '소재비', '블랙 매직 알터', '알레리아', '헤도', '리스트레인트', '마력 레테',
  '화면 감지', '화면공유 감지', '화면 공유 감지', '실시간 감지', '스킬 감지', '스킬 탐지',
  'maple timer', 'maple buff timer', 'maple skill detect', 'maplestory buff', 'maplestory timer',
];

export function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    alternateName: ['MapleBuffChecker', '버프체커'],
    url: SITE_URL,
    description: SITE_DESC,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires WebGL2',
    inLanguage: 'ko-KR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    author: { '@type': 'Person', name: '크로아 / 어둠음침마법' },
  };
}
