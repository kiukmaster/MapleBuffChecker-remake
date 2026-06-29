import { ImageResponse } from 'next/og';

export const alt = '메이플 버프 체커 – MapleStory skill detection & buff timer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Latin-only text so the default font renders cleanly (no Korean glyph fetch).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#1b1c1f',
          color: '#eef0ee',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#7cc466' }} />
          <div style={{ display: 'flex', fontSize: '40px', fontWeight: 700 }}>
            <span>Maple</span><span style={{ color: '#7cc466' }}>BuffChecker</span>
          </div>
        </div>
        <div style={{ fontSize: '76px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px' }}>
          MapleStory skill detection
        </div>
        <div style={{ fontSize: '76px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', color: '#7cc466' }}>
          &amp; buff timer
        </div>
        <div style={{ marginTop: '34px', fontSize: '28px', color: '#9a9ba1' }}>
          Real-time on-screen detection · alerts you by sound
        </div>
      </div>
    ),
    { ...size },
  );
}
