// Route-level metadata for the (client-component) patch-notes page.
export const metadata = {
  title: '패치노트',
  description: '메이플 버프 체커의 업데이트 내역과 패치노트를 확인하세요.',
  alternates: { canonical: '/update' },
  openGraph: { title: '패치노트 – 메이플 버프 체커', url: '/update' },
};

export default function UpdateLayout({ children }) {
  return children;
}
