import { createRoot } from 'react-dom/client';
import '@fontsource/jua/400.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
