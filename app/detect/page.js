'use client';

import { useRef, useState } from 'react';
import { SKILLS, CATEGORIES, RESOLUTIONS, DURATIONS } from '@/lib/detection/catalog';
import { useDetector } from '@/lib/detection/useDetector';
import { useCustomSounds } from '@/lib/sound/useCustomSounds';
import { CUSTOM_PREFIX, ACCEPT_ATTR, formatBytes, customSounds } from '@/lib/sound/customSounds';
import HelpModal, { useHelp } from '@/app/components/HelpModal';
import { useSpecialPip } from '@/app/components/SpecialPip';

const CAT_COLOR = { hunting: '#5aa9e0', boss: '#b07fd9', job: '#e0b15a' };

export default function DetectPage() {
  const d = useDetector();
  const custom = useCustomSounds();
  const help = useHelp();
  const pip = useSpecialPip(d.countdown.special);
  const [category, setCategory] = useState('all');
  const [showSounds, setShowSounds] = useState(false);

  const onResetSettings = () => {
    if (typeof window !== 'undefined' && !window.confirm('모든 설정과 추가한 알림음을 초기화할까요?')) return;
    d.actions.resetSettings();
    custom.clearAll();
  };

  const locked = d.isActive; // selection / resolution locked while running
  const enabledSkills = SKILLS.filter((s) => d.enabled[s.id]);
  const anyEnabled = enabledSkills.length > 0;
  const visibleSkills = SKILLS.filter((s) => category === 'all' || s.category === category);

  return (
    <main className="page detect">
      {/* ── header ── */}
      <header className="head">
        <div>
          <h1>스킬 감지</h1>
          <p className="muted sub">감지할 스킬을 고르고 화면 공유를 시작하면, 해당 아이콘이 화면에 뜰 때 알려드립니다.</p>
        </div>
        <div className={'status' + (d.isDetecting ? ' on' : '')}>
          <span className="dot">{d.isDetecting && <span className="ring" />}</span>
          {d.isDetecting ? '감지 중' : d.phase === 'starting' ? '준비 중' : '대기'}
        </div>
      </header>

      {/* ── global controls ── */}
      <div className="toolbar">
        <div className="field">
          <label>해상도</label>
          <select value={d.resolution} disabled={locked} onChange={(e) => d.actions.setResolution(e.target.value)}>
            {RESOLUTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="reset-group">
          <button className="btn ghost sm" disabled={locked} onClick={onResetSettings}>설정 초기화</button>
          <button className="btn ghost sm" onClick={help.resetAndShow} title="이 버튼을 누르면 도움말 팝업이 다시 표시됩니다!">팝업 초기화</button>
        </div>
        <div className="spacer" />
        <button className="btn ghost" onClick={help.show}>도움말 보기</button>
        <button className={'btn ghost' + (showSounds ? ' on' : '')} onClick={() => setShowSounds((v) => !v)}>
          내 알림음 추가하기{custom.items.length > 0 ? ` (${custom.items.length})` : ''}
        </button>
        {!d.isActive ? (
          <button className="btn primary" disabled={!anyEnabled} onClick={d.actions.start}>
            감지 시작
          </button>
        ) : (
          <button className="btn stop" onClick={d.actions.stop}>중지</button>
        )}
      </div>

      {showSounds && <SoundManager custom={custom} />}

      {d.error && <div className="alert">{d.error}</div>}

      {/* ── skill picker ── */}
      <section className="block">
        <div className="block-head">
          <h2>스킬 선택</h2>
          <div className="tabs">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={'tab' + (category === c.id ? ' active' : '')} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid">
          {visibleSkills.map((s) => (
            <button
              key={s.id}
              className={'chip' + (d.enabled[s.id] ? ' on' : '')}
              disabled={locked}
              onClick={() => d.actions.toggleSkill(s.id)}
            >
              <span className="cat" style={{ background: CAT_COLOR[s.category] }} />
              {s.icon && <img src={s.icon} alt="" />}
              <span className="name">{s.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── settings + live ── */}
      <div className="layout">
        <section className="col">
          <h2>선택한 스킬 설정 <span className="count">{enabledSkills.length}</span></h2>
          {!anyEnabled && <div className="empty">아직 선택된 스킬이 없습니다.</div>}
          <div className="settings">
            {enabledSkills.map((s) => (
              <div key={s.id} className="setting">
                <div className="setting-head">
                  {s.icon && <img src={s.icon} alt="" />}
                  <span className="title">{s.name}</span>
                </div>

                {s.durationSelect && (
                  <Row label="남은 시간">
                    <select value={d.durations[s.id]} disabled={locked} onChange={(e) => d.actions.setDuration(s.id, Number(e.target.value))}>
                      {DURATIONS.map((n) => <option key={n} value={n}>{n}초</option>)}
                    </select>
                  </Row>
                )}

                {s.alert.mode === 'timer' && (
                  <Row label="알림 시점">
                    <select value={d.specialLead} disabled={locked} onChange={(e) => d.actions.setSpecialLead(Number(e.target.value))}>
                      {s.alert.leadOptions.map((n) => <option key={n} value={n}>{n}초 전</option>)}
                    </select>
                  </Row>
                )}

                {s.alert.mode === 'timer' && pip.supported && (
                  <Row label="PiP 카운트다운">
                    <button className="btn ghost full" onClick={pip.open} disabled={pip.active}>
                      {pip.active ? 'PiP 표시 중' : 'PiP 창 열기'}
                    </button>
                  </Row>
                )}

                <Row label="알림음">
                  <div className="sound">
                    <select value={d.sounds[s.id]} onChange={(e) => d.actions.setSound(s.id, e.target.value)}>
                      {Object.keys(s.sounds).map((k) => <option key={k} value={k}>{k}</option>)}
                      {custom.items.length > 0 && (
                        <optgroup label="내 알림음">
                          {custom.items.map((c) => (
                            <option key={c.id} value={CUSTOM_PREFIX + c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button className={'play' + (d.previewing === s.id ? ' on' : '')} onClick={() => d.actions.preview(s.id)}>
                      {d.previewing === s.id ? '■' : '▶'}
                    </button>
                  </div>
                </Row>

                <Row label={`음량 ${Math.round((d.volumes[s.id] ?? 1) * 100)}%`}>
                  <input type="range" min="0" max="1" step="0.01" value={d.volumes[s.id] ?? 1}
                    onChange={(e) => d.actions.setVolume(s.id, parseFloat(e.target.value))} />
                </Row>

                <Row label={`정확도 ${Math.round(d.thresholds[s.id] * 100)}%`}>
                  <input type="range" min="0.5" max="1" step="0.01" value={d.thresholds[s.id]}
                    onChange={(e) => d.actions.setThreshold(s.id, parseFloat(e.target.value))} />
                </Row>
              </div>
            ))}
          </div>
        </section>

        <section className="col">
          <h2>실시간 화면</h2>
          <div className="monitor">
            {d.isDetecting && <div className="scan" />}
            <video ref={d.videoRef} muted playsInline style={{ display: d.isDetecting ? 'block' : 'none' }} />
            {!d.isDetecting && <span className="no-signal">화면 미연결</span>}
          </div>

          <h2 className="log-title">감지 로그</h2>
          {!anyEnabled && <div className="empty">선택한 스킬의 감지 상태가 여기에 표시됩니다.</div>}
          <div className="logs">
            {enabledSkills.map((s) => {
              const hit = d.detected[s.id];
              const cd = d.countdown[s.id];
              const score = Math.max(0, d.scores[s.id] ?? 0);
              return (
                <div key={s.id} className={'log' + (hit ? ' hit' : '')}>
                  <div className="log-top">
                    <span className="log-name">{s.name}</span>
                    <span className="log-score">{score.toFixed(3)}</span>
                  </div>
                  <div className="log-state">
                    {cd != null ? `발동 · ${cd}s` : hit ? '감지됨' : '대기'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <HelpModal open={help.open} onAck={help.ack} onDismiss={help.dismissForever} />
      {pip.node}

      <style jsx>{`
        .detect { display: flex; flex-direction: column; gap: 22px; }
        .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        h1 { font-size: 26px; letter-spacing: -0.025em; font-weight: 790; }
        .sub { font-size: 14px; margin-top: 6px; max-width: 560px; }
        h2 { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }

        .status {
          display: inline-flex; align-items: center; gap: 9px; flex-shrink: 0;
          padding: 8px 15px; border-radius: 999px; font-size: 13px; font-weight: 600;
          color: var(--text-muted); background: var(--surface); border: 1px solid var(--border);
        }
        .status .dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--text-faint); display: inline-flex; }
        .status.on { color: var(--accent-hover); background: var(--accent-soft); border-color: var(--accent-line); }
        .status.on .dot { background: var(--accent); }
        .status.on .ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--accent); animation: mbcRing 1.8s ease-out infinite; }

        .toolbar {
          display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 16px 18px;
        }
        .toolbar .spacer { flex: 1; min-width: 0; }
        .reset-group { display: flex; gap: 6px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 12px; color: var(--text-faint); }

        .alert {
          background: rgba(229,72,77,0.12); border: 1px solid rgba(229,72,77,0.32);
          color: #f1a6a6; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px;
        }

        .block { display: flex; flex-direction: column; gap: 14px; }
        .block-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .tabs { display: flex; gap: 4px; background: var(--surface); padding: 4px; border-radius: 999px; border: 1px solid var(--border); }
        .tab { padding: 6px 16px; border: none; background: transparent; color: var(--text-muted); font-size: 13px; border-radius: 999px; transition: all 0.15s; }
        .tab:hover { color: var(--text); }
        .tab.active { background: var(--accent); color: var(--on-accent); font-weight: 650; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 8px; }
        .chip {
          display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 46px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
          color: var(--text-muted); transition: all 0.15s; text-align: left; overflow: hidden;
        }
        .chip:hover:not(:disabled) { border-color: var(--accent-line); transform: translateY(-1px); color: var(--text); }
        .chip:disabled { cursor: not-allowed; opacity: 0.55; }
        .chip .cat { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .chip img { width: 24px; height: 24px; object-fit: contain; filter: grayscale(1) opacity(0.55); flex-shrink: 0; }
        .chip .name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chip.on { background: var(--accent-soft); border-color: var(--accent); color: var(--text); box-shadow: inset 0 0 0 1px rgba(124,196,102,.16); }
        .chip.on .cat { box-shadow: 0 0 0 4px var(--accent-ring); }
        .chip.on img { filter: none; }

        .layout { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
        .col { display: flex; flex-direction: column; gap: 14px; }
        .count { font-family: var(--mono); font-size: 12px; color: var(--accent-hover); background: var(--accent-soft); padding: 1px 8px; border-radius: 999px; }
        .empty { color: var(--text-faint); font-size: 14px; padding: 18px; border: 1px dashed var(--border); border-radius: var(--radius-sm); }

        .settings { display: flex; flex-direction: column; gap: 12px; max-height: 760px; overflow-y: auto; padding-right: 4px; }
        .setting { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
        .setting-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .setting-head img { width: 24px; height: 24px; object-fit: contain; }
        .setting-head .title { font-weight: 700; font-size: 15px; }
        .sound { display: flex; gap: 6px; }
        .sound select { flex: 1; }
        .play { width: 40px; flex-shrink: 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: var(--radius-sm); font-size: 11px; }
        .play.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

        .monitor {
          position: relative; aspect-ratio: 16/9; background: #161719;
          border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .monitor video { width: 100%; height: 100%; object-fit: contain; }
        .monitor .scan {
          position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 2;
          background: linear-gradient(90deg, transparent, rgba(124,196,102,.65), transparent);
          box-shadow: 0 0 12px rgba(124,196,102,.45);
          animation: mbcScan 2.8s linear infinite;
        }
        .no-signal { color: var(--text-faint); font-size: 13px; }
        .log-title { margin-top: 6px; }

        .logs { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .log { background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: 11px 13px; transition: all 0.15s; }
        .log.hit { border-color: var(--accent-line); background: rgba(124,196,102,.12); animation: mbcGlow 1.8s ease-in-out infinite; }
        .log-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .log-name { font-size: 13px; font-weight: 600; }
        .log-score { font-family: var(--mono); font-size: 12px; color: var(--text-faint); }
        .log.hit .log-score { color: var(--accent-hover); }
        .log-state { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
        .log.hit .log-state { color: var(--accent-hover); font-weight: 600; }

        @media (max-width: 880px) { .layout { grid-template-columns: 1fr; } .settings { max-height: none; } }
      `}</style>

      {/* shared control styling (selects / ranges) */}
      <style jsx global>{`
        .detect select {
          background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; font-family: inherit;
          outline: none; min-width: 110px;
        }
        .detect select:disabled { opacity: 0.55; cursor: not-allowed; }
        .detect input[type='range'] { width: 100%; accent-color: var(--accent); cursor: pointer; }
        .detect .btn { padding: 11px 22px; border: 1px solid transparent; border-radius: 11px; font-weight: 700; font-size: 14px; transition: all 0.15s; }
        .detect .btn.primary { background: var(--accent); color: var(--on-accent); }
        .detect .btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
        .detect .btn.primary:disabled { background: var(--surface-3); color: var(--text-faint); cursor: not-allowed; }
        .detect .btn.stop { background: var(--surface-2); color: var(--text); border-color: var(--border-strong); }
        .detect .btn.stop:hover { background: var(--surface-3); }
        .detect .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--border-strong); }
        .detect .btn.ghost:hover { color: var(--text); background: var(--surface-2); }
        .detect .btn.ghost.on { color: var(--text); background: var(--surface-2); border-color: var(--accent); }
        .detect .btn.sm { padding: 8px 12px; font-size: 12.5px; border-radius: 9px; }
        .detect .btn.full { width: 100%; }
      `}</style>
    </main>
  );
}

function SoundManager({ custom }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = async (files) => {
    for (const f of files) await custom.add(f);
  };
  const onPick = async (e) => {
    await addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };
  const onDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    await addFiles(Array.from(e.dataTransfer?.files || []));
  };
  const onDragOver = (e) => { e.preventDefault(); if (!dragging) setDragging(true); };
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); };

  const preview = (id) => {
    const url = customSounds.urlFor(id);
    if (url) new Audio(url).play().catch(() => {});
  };

  return (
    <div
      className={'sm' + (dragging ? ' dragging' : '')}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && <div className="sm-drop">여기에 놓으면 추가됩니다 (wav · mp3)</div>}
      <div className="sm-head">
        <div>
          <h3>내 알림음</h3>
          <p className="muted">wav · mp3 파일을 추가하거나 이 영역으로 끌어다 놓으세요. 추가하면 모든 스킬의 알림음 목록에서 선택할 수 있고, 이 브라우저에만 저장됩니다(서버 전송 없음).</p>
        </div>
        <button className="btn primary" onClick={() => inputRef.current?.click()}>파일 추가</button>
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={onPick} />
      </div>

      <div className="sm-usage">
        {custom.items.length} / {custom.limits.count}개 · {formatBytes(custom.totalBytes)} / {formatBytes(custom.limits.total)}
        <span className="faint"> · 파일당 최대 {formatBytes(custom.limits.file)}</span>
      </div>
      {custom.error && <div className="sm-error">{custom.error}</div>}

      {custom.items.length === 0 ? (
        <div className="sm-empty">아직 추가한 알림음이 없습니다.</div>
      ) : (
        <ul className="sm-list">
          {custom.items.map((c) => (
            <li key={c.id}>
              <span className="sm-name">{c.name}</span>
              <span className="sm-size faint">{formatBytes(c.size)}</span>
              <button className="sm-mini" onClick={() => preview(c.id)} title="미리듣기">▶</button>
              <button className="sm-mini del" onClick={() => custom.remove(c.id)} title="삭제">✕</button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .sm { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.15s, background 0.15s; }
        .sm.dragging { border-color: var(--accent); background: var(--accent-soft); }
        .sm-drop {
          position: absolute; inset: 4px; z-index: 3; display: flex; align-items: center; justify-content: center;
          border: 2px dashed var(--accent); border-radius: var(--radius-sm);
          background: rgba(27,28,31,0.72); color: var(--accent-hover); font-size: 14px; font-weight: 600;
          pointer-events: none;
        }
        .sm-head { display: flex; align-items: center; gap: 16px; }
        .sm-head > div { flex: 1; }
        .sm-head h3 { font-size: 15px; font-weight: 650; margin-bottom: 4px; }
        .sm-head p { font-size: 13px; }
        .sm-usage { font-size: 12px; color: var(--text-muted); }
        .sm-error { background: rgba(229,72,77,0.12); border: 1px solid rgba(229,72,77,0.32); color: #f1a6a6; padding: 9px 12px; border-radius: var(--radius-sm); font-size: 13px; }
        .sm-empty { color: var(--text-faint); font-size: 13px; padding: 12px; border: 1px dashed var(--border); border-radius: var(--radius-sm); }
        .sm-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .sm-list li { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; }
        .sm-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sm-size { font-size: 12px; }
        .sm-mini { width: 30px; height: 28px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text); border-radius: 7px; font-size: 11px; }
        .sm-mini.del:hover { background: #e5484d; border-color: #e5484d; color: #fff; }
      `}</style>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="row">
      <label>{label}</label>
      {children}
      <style jsx>{`
        .row { margin-bottom: 11px; }
        .row:last-child { margin-bottom: 0; }
        .row label { display: block; font-size: 12px; color: var(--text-faint); margin-bottom: 6px; }
      `}</style>
    </div>
  );
}
