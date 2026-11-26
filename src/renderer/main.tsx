import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuickWindow } from './QuickWindow';
import './styles.css';

// The same bundle serves the main window and the Ctrl+Alt+T quick-add box (#quick).
const isQuick = window.location.hash === '#quick';
document.body.classList.toggle('quick-mode', isQuick);
createRoot(document.getElementById('root')!).render(isQuick ? <QuickWindow /> : <App />);
