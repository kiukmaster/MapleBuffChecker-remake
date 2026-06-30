// Route-level metadata for the (client-component) region-detect page.
export const metadata = {
  title: '영역 감지',
  description:
    '화면 공유 후 감지할 영역만 사각형으로 지정해, 그 부분만 실시간으로 감지하는 메이플 버프 체커의 영역 지정 감지 모드입니다. 영역이 작을수록 더 가볍게 동작합니다.',
  alternates: { canonical: '/detect2' },
  openGraph: { title: '영역 감지 – 메이플 버프 체커', url: '/detect2' },
};

export default function Detect2Layout({ children }) {
  return children;
}
