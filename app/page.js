import Link from 'next/link';

export default function Home() {
  return (
    <main className="page home">
      <section className="hero">
        <span className="badge">GPU 기반 경량 감지 · 새 버전</span>
        <h1>
          버프 타이밍을,<br />
          <span className="accent">화면이 알아서</span> 알려줍니다.
        </h1>
        <p className="lead">
          미리 등록된 스킬 아이콘을 내 화면에서 실시간으로 찾아, 설치기·버프의 재사용 시점에
          소리로 알려주는 메이플스토리 비공식 도우미입니다. 무거운 라이브러리 없이 GPU로
          가볍게 동작하도록 새로 만들었습니다.
        </p>
        <div className="cta">
          <Link href="/detect" className="btn primary">스킬 감지 시작하기</Link>
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
        .hero { padding-top: 48px; max-width: 720px; }
        .badge {
          display: inline-block; font-size: 13px; color: var(--accent);
          background: var(--accent-soft); padding: 6px 12px; border-radius: 999px;
          margin-bottom: 22px;
        }
        .hero h1 {
          font-size: clamp(34px, 6vw, 52px); line-height: 1.1; letter-spacing: -0.02em;
          font-weight: 750; margin-bottom: 20px;
        }
        .hero h1 .accent { color: var(--accent); }
        .lead { font-size: 17px; color: var(--text-muted); margin-bottom: 32px; }
        .cta { display: flex; gap: 12px; }
        .btn {
          display: inline-flex; align-items: center; padding: 13px 24px;
          border-radius: 12px; font-weight: 650; font-size: 15px; transition: all 0.15s;
        }
        .btn.primary { background: var(--accent); color: #fff; }
        .btn.primary:hover { background: var(--accent-hover); transform: translateY(-1px); }

        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 24px;
        }
        .card h3 { font-size: 17px; margin-bottom: 8px; }
        .card p { font-size: 14px; }
        @media (max-width: 760px) { .features { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
