// Route-level metadata for the (client-component) detect page.
export const metadata = {
  title: '스킬 감지',
  description:
    '메이플스토리 화면을 공유하면 파운틴·야누스·일격필살·유니온·설치기 등 선택한 스킬을 ' +
    '실시간으로 감지해 재사용 타이밍을 소리로 알려줍니다. 스킬별 알림음과 감지 정확도를 조절하세요.',
  alternates: { canonical: '/detect' },
  openGraph: { title: '스킬 감지 – 메이플 버프 체커', url: '/detect' },
};

export default function DetectLayout({ children }) {
  return children;
}
