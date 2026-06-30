// ─────────────────────────────────────────────────────────────────────────
// 도움말 팝업 "내용" — 여기를 직접 채워 주세요. (디자인/모달은 HelpModal.js)
//
// 텍스트는 <p>, 소제목은 <h3>, 이미지는 <img src="/help/파일명.png" />.
// 이미지 파일은 public/help/ 폴더에 넣으면 됩니다.
// 스타일은 아래 .help-content 규칙으로 이미 잡혀 있으니 내용만 바꾸면 됩니다.
// ─────────────────────────────────────────────────────────────────────────
export default function HelpContent() {
  return (
    <div className="help-content">
      <h2>사용 방법</h2>

      {/* TODO: 아래 예시를 지우고 실제 도움말 내용을 채워 주세요. */}
      <p>여기에 도움말 내용을 작성하세요. 사진은 아래처럼 넣을 수 있습니다.</p>

      {/*
      <h3>1. 스킬 선택</h3>
      <p>감지할 스킬을 고릅니다.</p>
      <img src="/help/step1.png" alt="스킬 선택" />

      <h3>2. 화면 공유</h3>
      <p>게임 창을 선택해 공유합니다.</p>
      <img src="/help/step2.png" alt="화면 공유" />
      */}

      <style jsx>{`
        .help-content h2 { font-size: 19px; font-weight: 750; letter-spacing: -0.02em; margin-bottom: 14px; }
        .help-content h3 { font-size: 15px; font-weight: 650; margin: 18px 0 8px; }
        .help-content p { font-size: 14px; line-height: 1.7; color: var(--text-muted); margin-bottom: 12px; }
        .help-content img { display: block; max-width: 100%; border-radius: 10px; border: 1px solid var(--border); margin: 8px 0 16px; }
        .help-content ul { padding-left: 18px; margin-bottom: 12px; }
        .help-content li { font-size: 14px; line-height: 1.7; color: var(--text-muted); }
        .help-content b { color: var(--text); }
      `}</style>
    </div>
  );
}
