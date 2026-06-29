import Link from 'next/link';

export default function Home() {
  return (
    <main className="page home">
      <section className="hero">
        <span className="live"><span className="d" />실시간 감지 · GPU 경량 엔진</span>
        <h1>버프 타이밍을,<br /><span className="accent">화면이 알아서</span> 알려줍니다.</h1>
        <p className="lead">
          미리 등록된 스킬 아이콘을 내 화면에서 실시간으로 찾아, 설치기·버프의 재사용 시점에
          소리로 알려주는 메이플스토리 비공식 도우미입니다.
        </p>
        <div className="cta">
          <Link href="/detect" className="btn primary">스킬 감지 시작하기 →</Link>
          <Link href="/update" className="btn ghost">패치노트 보기</Link>
        </div>
      </section>

      <section className="features">
        {[
          { t: '가볍게', d: '11MB짜리 OpenCV 대신 GPU 셰이더로 매칭해 메모리 사용과 끊김을 줄였습니다.' },
          { t: '내가 고른 스킬만', d: '사냥 · 보스 · 직업 카테고리에서 필요한 스킬만 선택해 감지합니다.' },
          { t: '소리로 알림', d: '스킬별로 알림음과 음량, 감지 정확도를 따로 조절할 수 있습니다.' },
        ].map((f) => (
          <div key={f.t} className="card">
            <h3>{f.t}</h3>
            <p className="muted">{f.d}</p>
          </div>
        ))}
      </section>

      <style>{`
        .home { display: flex; flex-direction: column; gap: 56px; }
        .hero { padding-top: 48px; max-width: 760px; }
        .live {
          display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600;
          color: var(--accent-hover); background: var(--accent-soft);
          border: 1px solid var(--accent-line); padding: 6px 13px; border-radius: 999px; margin-bottom: 22px;
        }
        .live .d { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: mbcPulse 1.3s infinite; }
        .hero h1 {
          font-size: clamp(34px, 6vw, 50px); line-height: 1.08; letter-spacing: -0.03em;
          font-weight: 800; margin-bottom: 18px; text-wrap: balance;
        }
        .hero h1 .accent { color: var(--accent); }
        .lead { font-size: 16.5px; color: var(--text-muted); margin-bottom: 28px; line-height: 1.65; }
        .cta { display: flex; gap: 12px; align-items: center; }
        .btn {
          display: inline-flex; align-items: center; padding: 14px 24px;
          border-radius: 12px; font-weight: 700; font-size: 15px; transition: all 0.15s;
        }
        .btn.primary { background: var(--accent); color: var(--on-accent); box-shadow: 0 6px 20px rgba(124,196,102,.22); }
        .btn.primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
        .btn.ghost { color: var(--text-muted); border: 1px solid var(--border-strong); }
        .btn.ghost:hover { color: var(--text); border-color: rgba(255,255,255,.24); }

        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 22px; transition: all 0.15s;
        }
        .card:hover { border-color: var(--accent-line); transform: translateY(-3px); }
        .card h3 { font-size: 16.5px; margin-bottom: 8px; font-weight: 700; }
        .card p { font-size: 14px; line-height: 1.6; }
        @media (max-width: 760px) { .features { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
