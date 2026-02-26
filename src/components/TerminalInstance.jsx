import React, { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import useTerminalStore from '@/stores/terminal-store';

// ── Font size limits for zoom ──────────────────────────────────────────
const FONT_MIN = 8;
const FONT_MAX = 28;
const FONT_DEFAULT = 13;

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
 * Keyboard shortcuts:
 *   Ctrl+C          — copy selection (or SIGINT if no selection)
 *   Ctrl+V          — paste from clipboard
 *   Ctrl+Shift+C    — copy selection
 *   Ctrl+Shift+V    — paste from clipboard
 *   Ctrl+= / Ctrl+- — zoom in / out
 *   Ctrl+0          — reset font size
 *   Ctrl+Shift+K    — clear scrollback + screen
 *   Ctrl+Shift+T    — new terminal tab
 *   Ctrl+Home       — scroll to top
 *   Ctrl+End        — scroll to bottom
 *   Right-click     — paste from clipboard
 *   Ctrl+Scroll     — zoom in/out
 *   Middle-click    — paste from clipboard
 *   Select text     — auto-copy to clipboard
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
      fontSize: FONT_DEFAULT,
      lineHeight: 1.4,
      theme: TERMINAL_THEME,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
      rightClickSelectsWord: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    // ── Helpers ────────────────────────────────────────────────────────

    const writeToPty = (data) => {
      window.electronAPI?.terminalWrite({ id: sessionId, data });
    };

    const pasteFromClipboard = () => {
      navigator.clipboard.readText().then((text) => {
        if (text) writeToPty(text);
      });
    };

    const copySelection = () => {
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
        term.clearSelection();
      }
    };

    const setFontSize = (size) => {
      const clamped = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
      term.options.fontSize = clamped;
      try { fitAddon.fit(); } catch { /* ignore */ }
      window.electronAPI?.terminalResize({ id: sessionId, cols: term.cols, rows: term.rows });
    };

    // ── Spawn shell ───────────────────────────────────────────────────

    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch { /* container not ready */ }

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

    // ── PTY output → xterm ────────────────────────────────────────────

    const cleanupData = window.electronAPI?.onTerminalData((data) => {
      if (data.id === sessionId) {
        term.write(data.data);
      }
    });

    const cleanupExit = window.electronAPI?.onTerminalExit((data) => {
      if (data.id === sessionId) {
        term.writeln(`\r\n\x1b[38;5;245m— Process exited (code ${data.code ?? '?'}) —\x1b[0m`);
        useTerminalStore.getState().markDead(sessionId);
      }
    });

    // ── Keyboard shortcuts ────────────────────────────────────────────

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Ctrl+C with selection → copy (without selection, ^C passes to PTY)
      if (ctrl && e.key === 'c' && term.hasSelection()) {
        copySelection();
        return false;
      }

      // Ctrl+Shift+C → explicit copy
      if (ctrl && shift && e.code === 'KeyC') {
        copySelection();
        return false;
      }

      // Ctrl+V or Ctrl+Shift+V → paste
      if (ctrl && e.key === 'v') {
        pasteFromClipboard();
        return false;
      }

      // Ctrl+= or Ctrl+Shift+= → zoom in
      if (ctrl && (e.key === '=' || e.key === '+')) {
        setFontSize(term.options.fontSize + 1);
        return false;
      }

      // Ctrl+- → zoom out
      if (ctrl && e.key === '-') {
        setFontSize(term.options.fontSize - 1);
        return false;
      }

      // Ctrl+0 → reset zoom
      if (ctrl && e.key === '0') {
        setFontSize(FONT_DEFAULT);
        return false;
      }

      // Ctrl+Shift+K → clear scrollback + screen
      if (ctrl && shift && e.code === 'KeyK') {
        term.clear();
        return false;
      }

      // Ctrl+Shift+T → new terminal tab
      if (ctrl && shift && e.code === 'KeyT') {
        useTerminalStore.getState().createSession();
        return false;
      }

      // Ctrl+Home → scroll to top
      if (ctrl && e.key === 'Home') {
        term.scrollToTop();
        return false;
      }

      // Ctrl+End → scroll to bottom
      if (ctrl && e.key === 'End') {
        term.scrollToBottom();
        return false;
      }

      return true;
    });

    // ── Forward keystrokes to PTY ─────────────────────────────────────

    const onDataDisposable = term.onData((data) => {
      const session = useTerminalStore.getState().sessions.find(s => s.id === sessionId);
      if (session && !session.alive) return;
      writeToPty(data);
    });

    // ── Selection auto-copy ───────────────────────────────────────────

    const onSelectionDisposable = term.onSelectionChange(() => {
      if (term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
      }
    });

    // ── Mouse: right-click paste, middle-click paste, Ctrl+scroll zoom

    const onContextMenu = (e) => {
      e.preventDefault();
      pasteFromClipboard();
    };

    const onMouseDown = (e) => {
      // Middle-click → paste
      if (e.button === 1) {
        e.preventDefault();
        pasteFromClipboard();
      }
    };

    const onWheel = (e) => {
      // Ctrl+scroll → zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        setFontSize(term.options.fontSize + delta);
      }
    };

    const container = containerRef.current;
    container.addEventListener('contextmenu', onContextMenu);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('wheel', onWheel, { passive: false });

    // ── Resize observer ───────────────────────────────────────────────

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        window.electronAPI?.terminalResize({ id: sessionId, cols: term.cols, rows: term.rows });
      } catch { /* ignore */ }
    });
    resizeObserver.observe(container);

    cleanupRef.current = [cleanupData, cleanupExit];

    return () => {
      onDataDisposable.dispose();
      onSelectionDisposable.dispose();
      resizeObserver.disconnect();
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('wheel', onWheel);
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
