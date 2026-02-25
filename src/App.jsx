import React, { useState, useEffect, useCallback } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { Toaster } from 'sonner';
import useUiStore from '@/stores/ui-store';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import WelcomeModal from '@/components/WelcomeModal';
import GuidedTour from '@/components/GuidedTour';
import UpdateNotification from '@/components/UpdateNotification';
import Dashboard from '@/views/Dashboard';
import AgentBuilder from '@/views/AgentBuilder';
import TrainingStudio from '@/views/TrainingStudio';
import ExecutionMonitor from '@/views/ExecutionMonitor';
import DeploymentCenter from '@/views/DeploymentCenter';
import ResourceLibrary from '@/views/ResourceLibrary';
import MediaLibrary from '@/views/MediaLibrary';
import Settings from '@/views/Settings';
import ChatbotBuilder from '@/views/ChatbotBuilder';
import BusinessAssistant from '@/views/BusinessAssistant';
import TerminalView from '@/views/Terminal';

const VIEW_MAP = {
  dashboard: Dashboard,
  builder: AgentBuilder,
  training: TrainingStudio,
  monitor: ExecutionMonitor,
  deploy: DeploymentCenter,
  resources: ResourceLibrary,
  media: MediaLibrary,
  chatbot: ChatbotBuilder,
  assistant: BusinessAssistant,
  terminal: TerminalView,
  settings: Settings,
};

export default function App() {
  const view = useUiStore((s) => s.view);
  const tourActiveView = useUiStore((s) => s.tourActiveView);
  const completedTours = useUiStore((s) => s.completedTours);
  const startTour = useUiStore((s) => s.startTour);
  const finishTour = useUiStore((s) => s.finishTour);
  const loadCompletedTours = useUiStore((s) => s.loadCompletedTours);
  const ActiveView = VIEW_MAP[view] || Dashboard;

  // Onboarding state
  const [showWelcome, setShowWelcome] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Load completed tours + check onboarding on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadCompletedTours();
      try {
        const settings = await window.electronAPI?.loadSettings();
        if (!cancelled && !settings?.onboardingComplete) {
          setShowWelcome(true);
        } else {
          setOnboardingDone(true);
        }
      } catch {
        if (!cancelled && !localStorage.getItem('onboardingComplete')) {
          setShowWelcome(true);
        } else {
          setOnboardingDone(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-trigger tour on first visit to each view (after onboarding)
  useEffect(() => {
    if (!onboardingDone) return;
    if (tourActiveView) return; // already showing a tour
    if (completedTours[view]) return; // already completed this view's tour

    // Small delay so DOM has data-tour attributes ready
    const timer = setTimeout(() => {
      startTour(view);
    }, 500);
    return () => clearTimeout(timer);
  }, [view, onboardingDone, completedTours, tourActiveView]);

  const handleWelcomeClose = useCallback(async () => {
    setShowWelcome(false);
    // Save onboarding complete
    try {
      const settings = await window.electronAPI?.loadSettings() || {};
      await window.electronAPI?.saveSettings({ ...settings, onboardingComplete: true });
    } catch {
      localStorage.setItem('onboardingComplete', 'true');
    }
  }, []);

  const handleStartTour = useCallback(() => {
    setOnboardingDone(true);
    // Small delay so DOM has data-tour attributes ready
    setTimeout(() => startTour('dashboard'), 300);
  }, [startTour]);

  const handleTourFinish = useCallback(() => {
    if (tourActiveView) {
      finishTour(tourActiveView);
    }
  }, [tourActiveView, finishTour]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg)]">
      {/* Frameless window title bar */}
      <TitleBar />

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <ActiveView />
        </main>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Onboarding */}
      <WelcomeModal
        open={showWelcome}
        onClose={handleWelcomeClose}
        onStartTour={handleStartTour}
      />
      <GuidedTour
        viewId={tourActiveView}
        run={!!tourActiveView}
        onFinish={handleTourFinish}
      />

      {/* Update notification toast */}
      <UpdateNotification />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--sf)',
            border: '1px solid var(--glassBd)',
            color: 'var(--tx)',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}

function TitleBar() {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div
      className="drag-region flex items-center justify-between h-9 min-h-[36px] bg-[var(--bg)] border-b border-[var(--glassBd)] px-3 select-none"
    >
      {/* App title */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span className="text-xs font-medium text-[var(--sb)] tracking-wide">
          AI Agent Dashboard
        </span>
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/5 transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} className="text-[var(--sb)]" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/5 transition-colors"
          aria-label="Maximize"
        >
          <Square size={11} className="text-[var(--sb)]" />
        </button>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-red-500/20 transition-colors"
          aria-label="Close"
        >
          <X size={14} className="text-[var(--sb)] hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}
