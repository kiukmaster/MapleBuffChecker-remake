import './globals.css';
import Navbar from './components/Navbar';
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESC, KEYWORDS, jsonLd } from '@/lib/seo';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s – 메이플 버프 체커',
  },
  description: SITE_DESC,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: '크로아 / 어둠음침마법' }],
  creator: '크로아 / 어둠음침마법',
  publisher: SITE_NAME,
  category: 'games',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  // 배포 후 발급받은 값으로 교체하세요(미설정 시 무시됨).
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || [] },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        <Navbar />
        {children}
        <footer className="site-footer">
          <span>Made by 크로아 / 어둠음침마법 || 챌린저스 / 어둠음침소환</span>
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
