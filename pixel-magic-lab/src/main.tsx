import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jua/400.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerGate } from './components/PlayerGate';

// 먼저 '누가 할까요?'를 고른 뒤 연구소를 열어요 (친구를 바꾸면 그 친구 기록으로 새로 열어요)
function Root() {
  const [round, setRound] = useState(0);
  const [ready, setReady] = useState(false);
  if (!ready)
    return (
      <PlayerGate
        onReady={() => {
          setRound((r) => r + 1);
          setReady(true);
        }}
      />
    );
  return <App key={round} onChangePlayer={() => setReady(false)} />;
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
);
