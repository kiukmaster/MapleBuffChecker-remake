'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchSchedulerByName } from '@/lib/maple/api';
import { captureNicknameOnce } from '@/lib/maple/ocr';

const KEY_STORAGE = 'mbc-nexon-apikey';

export default function SchedulerPage() {
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const [nickname, setNickname] = useState('');
  const [ocr, setOcr] = useState(null); // { raw, preview }
  const [capturing, setCapturing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { ocid, data }
  const keyRef = useRef(null);

  // Restore a previously saved key (kept only in this browser).
  useEffect(() => {
    try {
      const k = localStorage.getItem(KEY_STORAGE);
      if (k) { setApiKey(k); setKeySaved(true); }
    } catch {}
  }, []);

  const saveKey = () => {
    try { localStorage.setItem(KEY_STORAGE, apiKey.trim()); setKeySaved(true); } catch {}
  };
  const clearKey = () => {
    try { localStorage.removeItem(KEY_STORAGE); } catch {}
    setApiKey(''); setKeySaved(false);
  };

  const capture = async () => {
    setError(null);
    setCapturing(true);
    try {
      const res = await captureNicknameOnce();
      setOcr({ raw: res.raw, preview: res.preview });
      setNickname(res.nickname);
      if (!res.nickname) setError('닉네임을 자동으로 읽지 못했습니다. 아래 입력란에 직접 입력해 주세요.');
    } catch (e) {
      if (e?.name !== 'NotAllowedError') setError(e?.message || '화면 인식에 실패했습니다.');
    } finally {
      setCapturing(false);
    }
  };

  const query = async () => {
    setError(null);
    setResult(null);
    const name = nickname.trim();
    if (!apiKey.trim()) { setError('먼저 API 키를 입력해 주세요.'); keyRef.current?.focus(); return; }
    if (!name) { setError('조회할 닉네임을 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const r = await fetchSchedulerByName(name, apiKey.trim(), undefined);
      setResult(r);
    } catch (e) {
      setError(e?.message || '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page sched">
      <header className="s-head">
        <h1>캐릭터 스케줄러</h1>
        <p className="muted">화면 공유로 내 캐릭터 닉네임을 읽어, 메이플스토리 OpenAPI에서 스케줄러 정보를 가져옵니다.</p>
      </header>

      {/* 1) API key */}
      <section className="card">
        <div className="card-num">1</div>
        <div className="card-body">
          <h2>API 키 입력</h2>
          <p className="muted small">
            NEXON Open API에서 발급받은 키를 입력하세요. 키는 이 브라우저에만 저장되며 서버로 전송되지 않습니다.
            발급: <a href="https://openapi.nexon.com" target="_blank" rel="noreferrer">openapi.nexon.com</a>
          </p>
          <div className="key-row">
            <input
              ref={keyRef}
              type="password"
              placeholder="x-nxopen-api-key 값"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
              autoComplete="off"
            />
            <button className="btn ghost" onClick={saveKey} disabled={!apiKey.trim()}>저장</button>
            {keySaved && <button className="btn ghost" onClick={clearKey}>삭제</button>}
          </div>
          {keySaved && <p className="ok small">이 브라우저에 키가 저장되었습니다.</p>}
        </div>
      </section>

      {/* 2) nickname */}
      <section className="card">
        <div className="card-num">2</div>
        <div className="card-body">
          <h2>닉네임 가져오기</h2>
          <p className="muted small">화면 공유 후 한 장을 캡처해 왼쪽 아래 "Lv.### 닉네임"에서 닉네임만 읽어옵니다. 결과는 아래에서 직접 고칠 수 있습니다.</p>
          <div className="nick-row">
            <button className="btn primary" onClick={capture} disabled={capturing}>
              {capturing ? '인식 중…' : '화면 공유로 닉네임 인식'}
            </button>
            <input
              type="text"
              placeholder="닉네임 (직접 입력 가능)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button className="btn primary solid" onClick={query} disabled={loading}>
              {loading ? '조회 중…' : '조회'}
            </button>
          </div>
          {ocr && (
            <details className="ocr">
              <summary>인식 원문 보기</summary>
              <div className="ocr-body">
                {ocr.preview && <img src={ocr.preview} alt="인식 영역" />}
                <code>{ocr.raw || '(빈 결과)'}</code>
              </div>
            </details>
          )}
        </div>
      </section>

      {error && <div className="alert">{error}</div>}

      {result && (
        <section className="result">
          <div className="result-head">
            <h2>{nickname.trim()} 님의 스케줄러</h2>
            <span className="faint mono">ocid {result.ocid.slice(0, 12)}…</span>
          </div>
          <SchedulerView data={result.data} />
          <details className="raw">
            <summary>원본 응답(JSON)</summary>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </details>
        </section>
      )}

      <style jsx>{`
        .sched { display: flex; flex-direction: column; gap: 18px; max-width: 920px; }
        .s-head h1 { font-size: 26px; font-weight: 720; letter-spacing: -0.02em; }
        .s-head p { font-size: 14px; margin-top: 6px; }

        .card { display: flex; gap: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
        .card-num { width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; }
        .card-body { flex: 1; }
        .card-body h2 { font-size: 16px; font-weight: 650; margin-bottom: 6px; }
        .small { font-size: 13px; }
        .small a { color: var(--accent); text-decoration: underline; }
        .ok { color: var(--good); margin-top: 8px; }

        .key-row, .nick-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .key-row input { flex: 1; min-width: 220px; }
        .nick-row input { flex: 1; min-width: 180px; }

        .ocr { margin-top: 12px; font-size: 13px; }
        .ocr summary { cursor: pointer; color: var(--text-muted); }
        .ocr-body { display: flex; gap: 12px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
        .ocr-body img { max-height: 46px; image-rendering: pixelated; border: 1px solid var(--border); border-radius: 6px; background: #fff; }
        .ocr-body code { color: var(--text-muted); }

        .alert { background: rgba(229,72,77,0.12); border: 1px solid rgba(229,72,77,0.32); color: #f1a6a6; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px; }

        .result { display: flex; flex-direction: column; gap: 14px; }
        .result-head { display: flex; align-items: baseline; gap: 12px; }
        .result-head h2 { font-size: 18px; font-weight: 700; }
        .mono { font-family: ui-monospace, monospace; font-size: 12px; }
        .raw summary { cursor: pointer; color: var(--text-muted); font-size: 13px; }
        .raw pre { margin-top: 10px; background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; overflow: auto; font-size: 12px; max-height: 360px; }
      `}</style>

      <style jsx global>{`
        .sched input[type='text'], .sched input[type='password'] {
          background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 10px 12px; font-size: 14px; font-family: inherit; outline: none;
        }
        .sched input:focus { border-color: var(--accent); }
        .sched .btn { padding: 10px 18px; border: 1px solid transparent; border-radius: 10px; font-weight: 600; font-size: 14px; transition: all 0.15s; white-space: nowrap; }
        .sched .btn.primary { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
        .sched .btn.primary:hover:not(:disabled) { background: var(--accent); color: var(--on-accent); }
        .sched .btn.primary.solid { background: var(--accent); color: var(--on-accent); }
        .sched .btn.primary.solid:hover:not(:disabled) { background: var(--accent-hover); }
        .sched .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--border-strong); }
        .sched .btn.ghost:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }
        .sched .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </main>
  );
}

// ── Adaptive renderer ──────────────────────────────────────────────────────
// The exact scheduler schema isn't finalised, so this renders whatever shape
// comes back in a tidy way: scalars as a labelled grid, arrays of objects as
// cards, with a few known keys given Korean labels and completion badges.

const LABELS = {
  character_name: '캐릭터', date: '기준일', world_name: '월드', character_class: '직업',
  character_level: '레벨', name: '이름', title: '이름', type: '종류', category: '분류',
  count: '횟수', max_count: '최대', clear_count: '클리어', difficulty: '난이도',
  is_completed: '완료', completed: '완료', is_clear: '클리어', clear: '클리어',
  reward: '보상', description: '설명', boss_name: '보스', content_name: '컨텐츠', quest_name: '퀘스트',
};
const label = (k) => LABELS[k] || k.replace(/_/g, ' ');
const isScalar = (v) => v === null || typeof v !== 'object';
const looksBool = (k) => /(completed|clear|is_|done|finish)/i.test(k);

function Scalar({ k, v }) {
  if (typeof v === 'boolean' || (looksBool(k) && (v === 0 || v === 1 || v === '0' || v === '1'))) {
    const yes = v === true || v === 1 || v === '1';
    return <span className={'badge ' + (yes ? 'y' : 'n')}>{yes ? '완료' : '미완료'}</span>;
  }
  if (v === null || v === '' || v === undefined) return <span className="faint">-</span>;
  return <span>{String(v)}</span>;
}

function Field({ k, v }) {
  return (
    <div className="f">
      <span className="fk">{label(k)}</span>
      <span className="fv"><Scalar k={k} v={v} /></span>
    </div>
  );
}

function SchedulerView({ data }) {
  if (!data || typeof data !== 'object') {
    return <div className="empty">표시할 데이터가 없습니다.</div>;
  }
  const entries = Object.entries(data);
  const scalars = entries.filter(([, v]) => isScalar(v));
  const groups = entries.filter(([, v]) => !isScalar(v));

  return (
    <div className="sv">
      {scalars.length > 0 && (
        <div className="head-grid">
          {scalars.map(([k, v]) => <Field key={k} k={k} v={v} />)}
        </div>
      )}

      {groups.map(([k, v]) => {
        const arr = Array.isArray(v) ? v : null;
        if (arr && arr.length === 0) {
          return <section key={k} className="grp"><h3>{label(k)}</h3><div className="empty">없음</div></section>;
        }
        if (arr && arr.every(isScalar)) {
          return <section key={k} className="grp"><h3>{label(k)}</h3><div className="tags">{arr.map((x, i) => <span key={i} className="tag">{String(x)}</span>)}</div></section>;
        }
        const items = arr || [v]; // object → single card
        return (
          <section key={k} className="grp">
            <h3>{label(k)} {arr && <span className="cnt">{arr.length}</span>}</h3>
            <div className="cards">
              {items.map((it, i) => (
                <div key={i} className="ic">
                  {isScalar(it)
                    ? <Scalar k={k} v={it} />
                    : Object.entries(it).map(([kk, vv]) => (
                        isScalar(vv)
                          ? <Field key={kk} k={kk} v={vv} />
                          : <Field key={kk} k={kk} v={Array.isArray(vv) ? vv.join(', ') : JSON.stringify(vv)} />
                      ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <style jsx>{`
        .sv { display: flex; flex-direction: column; gap: 16px; }
        .head-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
        .grp h3 { font-size: 14px; font-weight: 650; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .cnt { font-size: 11px; color: var(--text-faint); background: var(--surface-2); padding: 1px 8px; border-radius: 999px; }
        .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
        .ic { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
        .f { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
        .fk { font-size: 12px; color: var(--text-faint); }
        .fv { font-size: 13px; text-align: right; }
        .badge { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
        .badge.y { color: var(--good); background: var(--good-soft); }
        .badge.n { color: var(--text-faint); background: var(--surface-2); }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag { font-size: 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; }
        .empty { color: var(--text-faint); font-size: 13px; }
      `}</style>
    </div>
  );
}
