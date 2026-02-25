import React, { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import useTerminalStore from '@/stores/terminal-store';

/**
 * xterm.js theme matching the app's dark glassmorphism UI (variables.css).
 */
const TERMINAL_THEME = {
  background: '#0B0F1A',
  foreground: '#E2E8F0',
  cursor: '#3B82F6',
  cursorAccent: '#0B0F1A',
  selectionBackground: 'rgba(59, 130, 246, 0.3)',
  selectionForeground: '#E2E8F0',
  // ANSI colors (normal)
  black: '#1E293B',
  red: '#EF4444',
  green: '#22C55E',
  yellow: '#F59E0B',
  blue: '#3B82F6',
  magenta: '#A78BFA',
  cyan: '#06B6D4',
  white: '#E2E8F0',
  // ANSI colors (bright)
  brightBlack: '#64748B',
  brightRed: '#F87171',
  brightGreen: '#4ADE80',
  brightYellow: '#FBBF24',
  brightBlue: '#60A5FA',
  brightMagenta: '#C4B5FD',
  brightCyan: '#22D3EE',
  brightWhite: '#FFFFFF',
};

/**
 * TerminalInstance — wraps a single xterm.js Terminal bound to a shell session via IPC.
 *
 * Lifecycle:
 * 1. Mount: create Terminal + FitAddon + WebLinksAddon
 * 2. Call terminal:spawn IPC
 * 3. Subscribe to terminal:data → write to xterm
 * 4. Subscribe to terminal:exit → mark dead in store
 * 5. xterm onData → terminal:write IPC
 * 6. ResizeObserver → fitAddon.fit() + terminal:resize IPC
 * 7. Unmount: unsubscribe, kill process, term.dispose()
 */
export default function TerminalInstance({ sessionId, visible }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const cleanupRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      theme: TERMINAL_THEME,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    // Initial fit
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch { /* container not ready */ }
    });

    // Spawn the shell process via IPC
    window.electronAPI?.terminalSpawn({ id: sessionId }).then((result) => {
      if (!result?.success) {
        term.writeln(`\x1b[31mFailed to start shell: ${result?.error || 'Unknown error'}\x1b[0m`);
      }
    });

    // Listen for shell output
    const cleanupData = window.electronAPI?.onTerminalData((data) => {
      if (data.id === sessionId) {
        term.write(data.data);
      }
    });

    // Listen for shell exit
    const cleanupExit = window.electronAPI?.onTerminalExit((data) => {
      if (data.id === sessionId) {
        useTerminalStore.getState().markDead(sessionId);
      }
    });

    // Send keystrokes to shell
    const onDataDisposable = term.onData((data) => {
      window.electronAPI?.terminalWrite({ id: sessionId, data });
    });

    // Resize observer — re-fit terminal when container resizes
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        const dims = { cols: term.cols, rows: term.rows };
        window.electronAPI?.terminalResize({ id: sessionId, ...dims });
      } catch { /* ignore */ }
    });
    resizeObserver.observe(containerRef.current);

    cleanupRef.current = [cleanupData, cleanupExit];

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      cleanupRef.current.forEach((fn) => fn?.());
      window.electronAPI?.terminalKill({ id: sessionId });
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [sessionId]);

  // Re-fit when visibility changes (tab switch)
  useEffect(() => {
    if (visible && fitRef.current) {
      requestAnimationFrame(() => {
        try { fitRef.current.fit(); } catch { /* ignore */ }
      });
    }
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        display: visible ? 'block' : 'none',
        padding: '4px 0 0 4px',
        background: '#0B0F1A',
      }}
    />
  );
}
