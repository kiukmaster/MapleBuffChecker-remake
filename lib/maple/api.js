// ─────────────────────────────────────────────────────────────────────────
// NEXON MapleStory OpenAPI client — runs entirely in the browser.
//
// The API sends CORS headers, so we can call it directly with the user's key;
// nothing is proxied through our own server and the key never leaves the user's
// browser except to Nexon itself.
//
//   base URL  : https://open.api.nexon.com
//   auth      : header  x-nxopen-api-key: <key>
//   name→ocid : GET /maplestory/v1/id?character_name=<name>   → { ocid }
//   scheduler : GET <SCHEDULER_PATH>?ocid=<ocid>[&date=YYYY-MM-DD]
//
// NOTE: the Scheduler endpoint (docs id=57, "스케줄러 정보 조회") is brand new
// (data available 2026-06-25+). The gateway validates the api key *before* the
// path, so the exact path/response could not be confirmed without a live key.
// `SCHEDULER_PATH` is the single place to adjust if Nexon's actual path differs;
// the UI renders the response adaptively so any field shape displays cleanly.
// ─────────────────────────────────────────────────────────────────────────

const BASE = 'https://open.api.nexon.com';

export const SCHEDULER_PATH = '/maplestory/v1/character/scheduler';

const ERROR_KO = {
  OPENAPI00001: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  OPENAPI00002: '권한이 없는 API 키입니다.',
  OPENAPI00003: '유효하지 않은 식별자입니다. 닉네임을 다시 확인해 주세요.',
  OPENAPI00004: '요청 형식이 올바르지 않습니다. 닉네임을 확인해 주세요.',
  OPENAPI00005: 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.',
  OPENAPI00007: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  OPENAPI00009: '데이터 준비 중입니다. 잠시 후 다시 시도해 주세요.',
  OPENAPI00010: '서비스 점검 중입니다.',
  OPENAPI00011: '서버 오류가 발생했습니다.',
};

export class MapleApiError extends Error {
  constructor(payload, status) {
    const code = payload?.error?.name;
    const msg = ERROR_KO[code] || payload?.error?.message || `요청에 실패했습니다. (HTTP ${status})`;
    super(msg);
    this.name = 'MapleApiError';
    this.code = code;
    this.status = status;
  }
}

async function get(path, params, apiKey) {
  if (!apiKey) throw new MapleApiError({ error: { name: 'OPENAPI00005' } }, 0);
  const qs = new URLSearchParams(params).toString();
  let res;
  try {
    res = await fetch(`${BASE}${path}?${qs}`, { headers: { 'x-nxopen-api-key': apiKey } });
  } catch {
    throw new Error('네트워크 오류로 요청에 실패했습니다. 연결 상태를 확인해 주세요.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new MapleApiError(data, res.status);
  return data;
}

/** Character name → ocid (the id every other endpoint needs). */
export async function getOcid(characterName, apiKey) {
  const data = await get('/maplestory/v1/id', { character_name: characterName }, apiKey);
  if (!data?.ocid) throw new Error('해당 닉네임의 캐릭터를 찾을 수 없습니다.');
  return data.ocid;
}

/** Scheduler info for an ocid. `date` (YYYY-MM-DD, KST) is optional → latest. */
export async function getScheduler(ocid, apiKey, date) {
  const params = { ocid };
  if (date) params.date = date;
  return get(SCHEDULER_PATH, params, apiKey);
}

/** Convenience: name → ocid → scheduler in one call. */
export async function fetchSchedulerByName(characterName, apiKey, date) {
  const ocid = await getOcid(characterName, apiKey);
  const data = await getScheduler(ocid, apiKey, date);
  return { ocid, data };
}
