// 예상치 못한 오류가 나도 수업이 멈추지 않도록 다시 시작 버튼을 보여 줍니다.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <h1>앗! 마법이 잠깐 꼬였어요.</h1>
        <p>저장한 작품은 안전해요. 아래 버튼을 눌러 다시 시작해 주세요.</p>
        <button type="button" className="btn primary" onClick={() => location.reload()}>
          다시 시작하기
        </button>
      </div>
    );
  }
}
