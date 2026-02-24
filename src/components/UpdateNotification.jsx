import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import useUiStore from '@/stores/ui-store';

const SNOOZE_KEY = 'update-notification-snoozed';
const SNOOZE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default function UpdateNotification() {
  const [visible, setVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    const cleanup = window.electronAPI?.onUpdateEvent?.((eventName, data) => {
      if (eventName === 'update-available') {
        // Check if snoozed
        const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
        if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) {
          return; // Still snoozed
        }
        setUpdateInfo(data);
        setVisible(true);
      }
    });
    return () => cleanup?.();
  }, []);

  const handleUpdateNow = () => {
    setVisible(false);
    // Navigate to settings
    useUiStore.getState().setView('settings');
  };

  const handleLater = () => {
    setVisible(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
      <div className="bg-[var(--sf)]/95 backdrop-blur-xl border border-[var(--glassBd)] rounded-xl shadow-2xl p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
            <ArrowDownToLine size={16} className="text-[var(--blue)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--hd)]">
              Update Available
            </h4>
            <p className="text-xs text-[var(--sb)] mt-1">
              A new version{updateInfo?.version ? ` (v${updateInfo.version})` : ''} is available.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleUpdateNow}
                className="px-3 py-1.5 bg-[var(--blue)] hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleLater}
                className="px-3 py-1.5 text-xs text-[var(--dm)] hover:text-[var(--tx)] transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleLater}
            className="p-1 rounded text-[var(--dm)] hover:text-[var(--tx)] transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
