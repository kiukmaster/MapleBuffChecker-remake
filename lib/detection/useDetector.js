'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SKILLS, SKILL_BY_ID, RESOLUTIONS, templateUrl } from './catalog';
import { WebGLTemplateMatcher } from './WebGLTemplateMatcher';
import { AlertController } from './AlertController';
import { customSounds, isCustomChoice, customIdOf } from '../sound/customSounds';

const DETECT_INTERVAL_MS = 1000;

const defaultSound = (skill) => Object.keys(skill.sounds)[0];

// Resolve a per-skill sound selection to a playable URL: either a user-uploaded
// custom sound ("custom:<id>") or one of the skill's built-in voice/alarm clips.
function resolveSoundSrc(id, choice) {
  if (isCustomChoice(choice)) return customSounds.urlFor(customIdOf(choice));
  return SKILL_BY_ID[id].sounds[choice];
}

// Decode a template PNG into ImageData so the matcher can compute its stats.
function loadImageData(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Orchestrates screen capture, the WebGL matcher, the detection loop and the
 * alert controller. The page that consumes this hook only renders state and
 * calls the returned actions — all the moving parts live here.
 */
export function useDetector({ regionMode = false } = {}) {
  // idle | starting | selecting (region pick) | detecting | error
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);

  const [enabled, setEnabled] = useState(() => Object.fromEntries(SKILLS.map((s) => [s.id, false])));
  const [thresholds, setThresholds] = useState(() => Object.fromEntries(SKILLS.map((s) => [s.id, s.threshold])));
  const [sounds, setSounds] = useState(() => Object.fromEntries(SKILLS.map((s) => [s.id, defaultSound(s)])));
  const [volumes, setVolumes] = useState(() => Object.fromEntries(SKILLS.map((s) => [s.id, 1])));
  const [durations, setDurations] = useState(() =>
    Object.fromEntries(SKILLS.filter((s) => s.durationSelect).map((s) => [s.id, s.defaultDuration])),
  );
  const [resolution, setResolution] = useState(RESOLUTIONS[0].value);
  const [specialLead, setSpecialLead] = useState(() => SKILL_BY_ID.special.alert.defaultLeadSec);

  const [scores, setScores] = useState({});
  const [detected, setDetected] = useState({});
  const [countdown, setCountdown] = useState({});
  const [previewing, setPreviewing] = useState(null);

  // Live mirrors so the 1 Hz loop / async alarm timers read current settings
  // without being re-created. (sound, volume and threshold stay editable while
  // detecting; resolution / duration / skill selection are locked by the UI.)
  const thresholdsRef = useRef(thresholds);
  const soundsRef = useRef(sounds);
  const volumesRef = useRef(volumes);
  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);
  useEffect(() => { soundsRef.current = sounds; }, [sounds]);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);

  const videoRef = useRef(null);
  const matcherRef = useRef(null);
  const alertsRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const cyclingRef = useRef(false);
  const enabledIdsRef = useRef([]);
  const previewRef = useRef(null);
  // Region (ROI) mode: only this sub-rect of the shared frame is scanned.
  const regionRef = useRef(null);       // { x, y, w, h } in video pixels
  const roiCanvasRef = useRef(null);    // scratch canvas for cropping the ROI
  const playingRef = useRef({});        // id -> Audio currently playing (no-overlap)

  // Play a skill's alarm — but never overlap with itself: if that skill's sound
  // is still playing, the new trigger is skipped until the current one finishes.
  const playSound = useCallback((id) => {
    const current = playingRef.current[id];
    if (current && !current.ended) return; // still playing → don't replay yet
    const src = resolveSoundSrc(id, soundsRef.current[id]);
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = volumesRef.current[id] ?? 1;
    playingRef.current[id] = audio;
    const clear = () => { if (playingRef.current[id] === audio) playingRef.current[id] = null; };
    audio.addEventListener('ended', clear);
    audio.addEventListener('error', clear);
    audio.play().catch(clear);
  }, []);

  const stopLoop = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopLoop();
    alertsRef.current?.reset();
    alertsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    matcherRef.current?.dispose();
    matcherRef.current = null;
    regionRef.current = null;
    playingRef.current = {};
    setPhase('idle');
    setScores({});
    setDetected({});
    setCountdown({});
  }, [stopLoop]);

  // One detection cycle. Skills are scored one at a time with a *non-blocking*
  // GPU readback and an `await` between each — so the main thread/compositor is
  // never stalled and other GPU work (e.g. a YouTube video) stays smooth. The
  // cyclingRef guard skips a tick if the previous cycle is still in flight.
  const runCycle = useCallback(async () => {
    if (cyclingRef.current) return;
    const matcher = matcherRef.current;
    const video = videoRef.current;
    const alerts = alertsRef.current;
    if (!matcher || !alerts || !video || video.readyState < 2) return;

    // In region mode, crop the chosen sub-rect from the frame and scan only that
    // (faster + fewer false matches); otherwise upload the whole frame.
    const region = regionRef.current;
    let uploaded;
    if (region) {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return;
      const rx = Math.max(0, Math.min(Math.round(region.x), vw - 1));
      const ry = Math.max(0, Math.min(Math.round(region.y), vh - 1));
      const rw = Math.max(1, Math.min(Math.round(region.w), vw - rx));
      const rh = Math.max(1, Math.min(Math.round(region.h), vh - ry));
      let c = roiCanvasRef.current;
      if (!c) { c = document.createElement('canvas'); roiCanvasRef.current = c; }
      if (c.width !== rw || c.height !== rh) { c.width = rw; c.height = rh; }
      c.getContext('2d', { willReadFrequently: true }).drawImage(video, rx, ry, rw, rh, 0, 0, rw, rh);
      uploaded = matcher.uploadFrame(c);
    } else {
      uploaded = matcher.uploadFrame(video);
    }
    if (!uploaded) return;

    cyclingRef.current = true;
    try {
      const ids = enabledIdsRef.current;
      const now = Date.now();
      const next = {};
      for (const id of ids) {
        const s = await matcher.scoreAsync(id);
        if (matcherRef.current !== matcher) return; // detection stopped mid-cycle
        next[id] = s;
        const thr = thresholdsRef.current[id] ?? SKILL_BY_ID[id].threshold;
        alerts.feed(id, s >= thr, now);
      }
      setScores(next);
    } finally {
      cyclingRef.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const ids = SKILLS.filter((s) => enabled[s.id]).map((s) => s.id);
    if (ids.length === 0) {
      setError('감지할 스킬을 먼저 하나 이상 선택해 주세요.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('이 브라우저는 화면 공유를 지원하지 않습니다. 최신 크롬 / 엣지를 사용해 주세요.');
      return;
    }

    setPhase('starting');

    // 1) Request the screen first, while the click gesture is still valid.
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (e) {
      setPhase('idle');
      if (e?.name !== 'NotAllowedError') setError('화면 공유를 시작할 수 없습니다. (' + (e?.name || 'Error') + ')');
      return;
    }

    // 2) Spin up the GPU matcher.
    const matcher = new WebGLTemplateMatcher();
    if (!matcher.init()) {
      stream.getTracks().forEach((t) => t.stop());
      setPhase('idle');
      setError('감지 엔진(WebGL2)을 시작할 수 없습니다. 브라우저 설정에서 "하드웨어 가속 사용"을 켠 뒤 새로고침하거나, 최신 크롬 / 엣지로 다시 시도해 주세요.');
      return;
    }
    matcherRef.current = matcher;

    // 3) Wire the captured stream to the (hidden) video element.
    const video = videoRef.current;
    video.srcObject = stream;
    try { await video.play(); } catch { /* autoplay quirks — loop tolerates not-ready */ }
    streamRef.current = stream;
    stream.getVideoTracks().forEach((t) => t.addEventListener('ended', stop));

    // 4) Decode + register the templates for the chosen resolution / durations.
    await Promise.all(
      ids.map(async (id) => {
        const url = templateUrl(SKILL_BY_ID[id], resolution, durations[id]);
        const data = await loadImageData(url);
        if (data) matcher.setTemplate(id, data, url);
      }),
    );

    // 5) Alert controller.
    const alerts = new AlertController(SKILL_BY_ID, {
      play: playSound,
      setDetected: (id, v) => setDetected((d) => ({ ...d, [id]: v })),
      setCountdown: (id, v) => setCountdown((c) => ({ ...c, [id]: v })),
    });
    ids.forEach((id) => {
      if (SKILL_BY_ID[id].alert.mode === 'timer') alerts.setLead(id, specialLead);
    });
    alertsRef.current = alerts;

    // 6) Go. Region mode pauses for the user to draw the ROI (confirmRegion);
    //    otherwise start scanning the whole frame immediately.
    enabledIdsRef.current = ids;
    regionRef.current = null;
    if (regionMode) {
      setPhase('selecting');
    } else {
      setPhase('detecting');
      loopRef.current = setInterval(runCycle, DETECT_INTERVAL_MS);
    }
  }, [enabled, resolution, durations, specialLead, regionMode, playSound, runCycle, stop]);

  // Region mode: confirm the drawn rectangle (video-pixel coords) and start scanning.
  const confirmRegion = useCallback((rect) => {
    if (!rect || rect.w < 8 || rect.h < 8) {
      setError('영역이 너무 작습니다. 조금 더 크게 지정해 주세요.');
      return;
    }
    setError(null);
    regionRef.current = rect;
    setPhase('detecting');
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(runCycle, DETECT_INTERVAL_MS);
  }, [runCycle]);

  // ── settings actions ────────────────────────────────────────────────────
  const toggleSkill = useCallback((id) => {
    setEnabled((prev) => {
      const want = !prev[id];
      if (want) {
        const conflict = (SKILL_BY_ID[id].exclusiveWith || []).find((other) => prev[other]);
        if (conflict) {
          setError(`${SKILL_BY_ID[id].name}와(과) ${SKILL_BY_ID[conflict].name}은(는) 동시에 선택할 수 없습니다.`);
          return prev;
        }
      }
      setError(null);
      return { ...prev, [id]: want };
    });
  }, []);

  const setThreshold = useCallback((id, v) => setThresholds((t) => ({ ...t, [id]: v })), []);
  const setSound = useCallback((id, v) => setSounds((s) => ({ ...s, [id]: v })), []);
  const setVolume = useCallback((id, v) => setVolumes((vol) => ({ ...vol, [id]: v })), []);
  const setDuration = useCallback((id, v) => setDurations((d) => ({ ...d, [id]: v })), []);

  // Restore every per-skill setting (selection / sounds / volumes / thresholds /
  // durations / resolution / special lead) back to its default.
  const resetSettings = useCallback(() => {
    setEnabled(Object.fromEntries(SKILLS.map((s) => [s.id, false])));
    setThresholds(Object.fromEntries(SKILLS.map((s) => [s.id, s.threshold])));
    setSounds(Object.fromEntries(SKILLS.map((s) => [s.id, defaultSound(s)])));
    setVolumes(Object.fromEntries(SKILLS.map((s) => [s.id, 1])));
    setDurations(Object.fromEntries(SKILLS.filter((s) => s.durationSelect).map((s) => [s.id, s.defaultDuration])));
    setResolution(RESOLUTIONS[0].value);
    setSpecialLead(SKILL_BY_ID.special.alert.defaultLeadSec);
  }, []);

  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.audio.pause();
      previewRef.current = null;
      setPreviewing(null);
    }
  }, []);

  const preview = useCallback((id) => {
    if (previewRef.current?.id === id) { stopPreview(); return; }
    stopPreview();
    const src = resolveSoundSrc(id, sounds[id]);
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = volumes[id] ?? 1;
    audio.onended = () => { if (previewRef.current?.id === id) stopPreview(); };
    previewRef.current = { id, audio };
    setPreviewing(id);
    audio.play().catch(() => {});
  }, [sounds, volumes, stopPreview]);

  // Stop everything on unmount.
  useEffect(() => () => { stop(); stopPreview(); }, [stop, stopPreview]);

  return {
    phase,
    isActive: phase === 'starting' || phase === 'selecting' || phase === 'detecting',
    isDetecting: phase === 'detecting',
    isSelecting: phase === 'selecting',
    error,
    enabled, thresholds, sounds, volumes, durations, resolution, specialLead,
    scores, detected, countdown, previewing,
    videoRef,
    actions: {
      start, stop, toggleSkill, confirmRegion,
      setThreshold, setSound, setVolume, setDuration,
      setResolution, setSpecialLead, preview, stopPreview, resetSettings,
    },
  };
}
