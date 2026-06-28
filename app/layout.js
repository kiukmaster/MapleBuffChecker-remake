import './globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: '메이플 버프 체커',
  description:
    '메이플스토리 설치기·버프 스킬의 재사용 타이밍을 화면에서 감지해 알려주는 비공식 도우미입니다. GPU 기반 경량 감지로 가볍게 동작합니다.',
  metadataBase: new URL('https://maple-buff-checker.vercel.app/'),
  openGraph: {
    title: '메이플 버프 체커',
    description: '버프 타이밍을 알려주는 비공식 웹 사이트',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        {children}
        <footer className="site-footer">
          <span>Made by 크로아 / 어둠음침마법</span>
          <span className="dot">·</span>
          <span className="faint">비공식 유저 도우미</span>
        </footer>
        <style>{`
          .site-footer {
            display: flex; align-items: center; gap: 10px; justify-content: center;
            padding: 28px 24px; color: var(--text-muted); font-size: 13px;
            border-top: 1px solid var(--border); margin-top: 40px;
          }
          .site-footer .dot { color: var(--text-faint); }
        `}</style>
      </body>
    </html>
  );
}
