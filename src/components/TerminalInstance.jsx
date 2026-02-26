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
 * TerminalInstance — xterm.js wrapper with a client-side line buffer.
 *
 * Without a PTY, child_process doesn't provide:
 *   - Local echo (seeing what you type)
 *   - Line editing (backspace, arrow keys)
 *   - Prompt display
 *   - \r → \n translation (xterm sends \r for Enter)
 *   - Signal handling (Ctrl+C)
 *
 * This component implements a mini-readline that handles all of the above,
 * flushing complete lines to the shell's stdin on Enter.
 */
export default function TerminalInstance({ sessionId, visible }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const cleanupRef = useRef([]);
  // Line buffer state — kept in refs so the onData callback always sees current values
  const lineRef = useRef('');
  const cursorPosRef = useRef(0);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  // Track whether we're waiting for command output (suppress echo during output)
  const awaitingOutputRef = useRef(false);

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

    /** Rewrite the current line on screen (used after edits like backspace, arrow keys) */
    function redrawLine() {
      const line = lineRef.current;
      const pos = cursorPosRef.current;
      // Move cursor to start of input, clear to end of line, rewrite, reposition
      term.write('\x1b[2K\r');
      writePrompt();
      term.write(line);
      // Move cursor to correct position
      const backSteps = line.length - pos;
      if (backSteps > 0) {
        term.write(`\x1b[${backSteps}D`);
      }
    }

    /** Write the shell prompt indicator */
    function writePrompt() {
      term.write('\x1b[38;5;39m> \x1b[0m');
    }

    /** Show initial prompt */
    function showReady() {
      term.writeln('\x1b[38;5;245m— Shell session started —\x1b[0m');
      term.writeln('\x1b[38;5;245mType commands and press Enter to execute.\x1b[0m');
      writePrompt();
    }

    // Spawn the shell process via IPC
    window.electronAPI?.terminalSpawn({ id: sessionId }).then((result) => {
      if (!result?.success) {
        term.writeln(`\x1b[31mFailed to start shell: ${result?.error || 'Unknown error'}\x1b[0m`);
      } else {
        showReady();
      }
    });

    // Listen for shell output — write to xterm, then re-show prompt
    const cleanupData = window.electronAPI?.onTerminalData((data) => {
      if (data.id === sessionId) {
        awaitingOutputRef.current = false;
        term.write(data.data);
        // If the output doesn't end with a newline, add one
        if (!data.data.endsWith('\n') && !data.data.endsWith('\r')) {
          term.write('\r\n');
        }
        // Re-show prompt after output, with any in-progress line
        writePrompt();
        if (lineRef.current.length > 0) {
          term.write(lineRef.current);
          const backSteps = lineRef.current.length - cursorPosRef.current;
          if (backSteps > 0) {
            term.write(`\x1b[${backSteps}D`);
          }
        }
      }
    });

    // Listen for shell exit
    const cleanupExit = window.electronAPI?.onTerminalExit((data) => {
      if (data.id === sessionId) {
        term.writeln(`\r\n\x1b[38;5;245m— Process exited (code ${data.code ?? '?'}) —\x1b[0m`);
        useTerminalStore.getState().markDead(sessionId);
      }
    });

    /**
     * Handle keyboard input from xterm.
     * Implements line editing (local echo, backspace, arrows, history, Ctrl+C).
     */
    const onDataDisposable = term.onData((data) => {
      // If process is dead, ignore input
      const session = useTerminalStore.getState().sessions.find(s => s.id === sessionId);
      if (session && !session.alive) return;

      const code = data.charCodeAt(0);

      // --- Enter (\r) ---
      if (data === '\r') {
        const line = lineRef.current;
        term.write('\r\n');
        if (line.trim()) {
          historyRef.current.push(line);
          if (historyRef.current.length > 100) historyRef.current.shift();
        }
        historyIndexRef.current = -1;
        lineRef.current = '';
        cursorPosRef.current = 0;
        awaitingOutputRef.current = true;
        // Send to shell with newline
        window.electronAPI?.terminalWrite({ id: sessionId, data: line + '\n' });
        return;
      }

      // --- Backspace (\x7f) ---
      if (data === '\x7f' || data === '\b') {
        if (cursorPosRef.current > 0) {
          const line = lineRef.current;
          const pos = cursorPosRef.current;
          lineRef.current = line.slice(0, pos - 1) + line.slice(pos);
          cursorPosRef.current = pos - 1;
          redrawLine();
        }
        return;
      }

      // --- Ctrl+C ---
      if (data === '\x03') {
        // If there's a running command, send SIGINT equivalent
        if (awaitingOutputRef.current) {
          window.electronAPI?.terminalWrite({ id: sessionId, data: '\x03' });
        }
        // Clear current line
        term.write('^C\r\n');
        lineRef.current = '';
        cursorPosRef.current = 0;
        writePrompt();
        return;
      }

      // --- Ctrl+L (clear) ---
      if (data === '\x0c') {
        term.clear();
        lineRef.current = '';
        cursorPosRef.current = 0;
        writePrompt();
        return;
      }

      // --- Escape sequences (arrow keys, etc.) ---
      if (data.startsWith('\x1b[') || data.startsWith('\x1b')) {
        // Up arrow — history previous
        if (data === '\x1b[A') {
          const history = historyRef.current;
          if (history.length === 0) return;
          if (historyIndexRef.current === -1) {
            historyIndexRef.current = history.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
          }
          lineRef.current = history[historyIndexRef.current] || '';
          cursorPosRef.current = lineRef.current.length;
          redrawLine();
          return;
        }

        // Down arrow — history next
        if (data === '\x1b[B') {
          const history = historyRef.current;
          if (historyIndexRef.current === -1) return;
          if (historyIndexRef.current < history.length - 1) {
            historyIndexRef.current++;
            lineRef.current = history[historyIndexRef.current] || '';
          } else {
            historyIndexRef.current = -1;
            lineRef.current = '';
          }
          cursorPosRef.current = lineRef.current.length;
          redrawLine();
          return;
        }

        // Left arrow
        if (data === '\x1b[D') {
          if (cursorPosRef.current > 0) {
            cursorPosRef.current--;
            term.write('\x1b[D');
          }
          return;
        }

        // Right arrow
        if (data === '\x1b[C') {
          if (cursorPosRef.current < lineRef.current.length) {
            cursorPosRef.current++;
            term.write('\x1b[C');
          }
          return;
        }

        // Home
        if (data === '\x1b[H' || data === '\x1b[1~') {
          cursorPosRef.current = 0;
          redrawLine();
          return;
        }

        // End
        if (data === '\x1b[F' || data === '\x1b[4~') {
          cursorPosRef.current = lineRef.current.length;
          redrawLine();
          return;
        }

        // Delete key
        if (data === '\x1b[3~') {
          const line = lineRef.current;
          const pos = cursorPosRef.current;
          if (pos < line.length) {
            lineRef.current = line.slice(0, pos) + line.slice(pos + 1);
            redrawLine();
          }
          return;
        }

        // Ignore other escape sequences
        return;
      }

      // --- Regular printable characters ---
      if (code >= 32) {
        const line = lineRef.current;
        const pos = cursorPosRef.current;
        lineRef.current = line.slice(0, pos) + data + line.slice(pos);
        cursorPosRef.current = pos + data.length;
        if (pos === line.length) {
          // Appending at end — just echo
          term.write(data);
        } else {
          // Inserting in middle — redraw
          redrawLine();
        }
      }
    });

    // Resize observer
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

  // Re-fit when visibility changes
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
