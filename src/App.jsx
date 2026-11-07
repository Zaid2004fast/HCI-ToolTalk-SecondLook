import { useEffect, useRef, useState } from 'react';
import Home from './components/Home.jsx';
import Setup from './components/Setup.jsx';
import SessionFlow from './components/SessionFlow.jsx';
import DemoMode from './components/DemoMode.jsx';
import Results from './components/Results.jsx';
import About from './components/About.jsx';
import { loadProgress, saveProgress, clearProgress } from './lib/storage.js';
import { registerLiveRegion } from './lib/a11y.js';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [progress, setProgress] = useState(() => loadProgress());
  const liveRef = useRef(null);

  useEffect(() => {
    registerLiveRegion(liveRef.current);
  }, []);

  useEffect(() => {
    const titles = {
      home: 'Second Look',
      setup: 'Set up session · Second Look',
      session: 'Study session · Second Look',
      demo: 'Demo mode · Second Look',
      results: 'Results · Second Look',
      about: 'How it works · Second Look',
    };
    document.title = titles[screen] || 'Second Look';
  }, [screen]);

  const goHome = () => {
    setProgress(loadProgress());
    setScreen('home');
  };

  let view;
  if (screen === 'setup') {
    view = (
      <Setup
        onCancel={goHome}
        onStart={(session) => {
          const p = { session, step: 0 };
          saveProgress(p);
          setProgress(p);
          setScreen('session');
        }}
      />
    );
  } else if (screen === 'session' && progress) {
    view = <SessionFlow progress={progress} onExit={goHome} />;
  } else if (screen === 'demo') {
    view = <DemoMode onBack={goHome} />;
  } else if (screen === 'results') {
    view = <Results onBack={goHome} />;
  } else if (screen === 'about') {
    view = <About onBack={goHome} />;
  } else {
    view = (
      <Home
        progress={progress}
        onStart={() => setScreen('setup')}
        onResume={() => setScreen('session')}
        onDiscardProgress={() => {
          clearProgress();
          setProgress(null);
        }}
        onDemo={() => setScreen('demo')}
        onResults={() => setScreen('results')}
        onAbout={() => setScreen('about')}
      />
    );
  }

  return (
    <>
      <a className="sl-skip" href="#main">
        Skip to content
      </a>
      {view}
      <div ref={liveRef} className="sl-visually-hidden" aria-live="polite" aria-atomic="true" />
    </>
  );
}
