import React, { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import useTerminalStore from '@/stores/terminal-store';

const TERMINAL_THEME = {
  background: '#0B0F1A',
  foreground: '#E2E8F0',
  cursor: '#3B82F6',
  cursorAccent: '#0B0F1A',
  selectionBackground: 'rgba(59, 130, 246, 0.3)',
  selectionForeground: '#E2E8F0',
  black: '#1E293B',
  red: '#EF4444',
  green: '#22C55E',
  yellow: '#F59E0B',
  blue: '#3B82F6',
  magenta: '#A78BFA',
  cyan: '#06B6D4',
  white: '#E2E8F0',
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
 * TerminalInstance — xterm.js wrapper backed by a real PTY.
 *
 * All keystrokes are forwarded directly to the PTY via IPC.
 * The PTY's line discipline handles echo, line editing, signals,
 * history, tab completion — everything a real terminal does.
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

    // Initial fit, then spawn with the measured dimensions
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch { /* container not ready */ }

      // Spawn the shell with actual terminal dimensions
      window.electronAPI?.terminalSpawn({
        id: sessionId,
        cols: term.cols,
        rows: term.rows,
      }).then((result) => {
        if (!result?.success) {
          term.writeln(`\x1b[31mFailed to start shell: ${result?.error || 'Unknown error'}\x1b[0m`);
        }
      });
    });

    // Shell output → xterm (PTY sends combined stdout+stderr)
    const cleanupData = window.electronAPI?.onTerminalData((data) => {
      if (data.id === sessionId) {
        term.write(data.data);
      }
    });

    // Shell exit
    const cleanupExit = window.electronAPI?.onTerminalExit((data) => {
      if (data.id === sessionId) {
        term.writeln(`\r\n\x1b[38;5;245m— Process exited (code ${data.code ?? '?'}) —\x1b[0m`);
        useTerminalStore.getState().markDead(sessionId);
      }
    });

    // Forward all keystrokes to PTY — no local processing needed
    const onDataDisposable = term.onData((data) => {
      const session = useTerminalStore.getState().sessions.find(s => s.id === sessionId);
      if (session && !session.alive) return;
      window.electronAPI?.terminalWrite({ id: sessionId, data });
    });

    // Resize observer — send new dimensions to PTY
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        window.electronAPI?.terminalResize({ id: sessionId, cols: term.cols, rows: term.rows });
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
