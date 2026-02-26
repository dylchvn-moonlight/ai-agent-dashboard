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
 * TerminalInstance — xterm.js wrapper with client-side line buffer.
 *
 * Since we use child_process (no PTY), the shell doesn't echo keystrokes
 * or handle line editing. This component provides:
 *   - Local echo (see what you type)
 *   - Line editing (backspace, arrows, home/end, delete)
 *   - \r → \n translation (xterm sends \r, stdin needs \n)
 *   - Command history (up/down arrows)
 *   - Ctrl+C / Ctrl+L
 *
 * The shell (cmd.exe / bash) provides its own prompt in its stdout stream,
 * so we do NOT inject an additional prompt — we just pass output through.
 */
export default function TerminalInstance({ sessionId, visible }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const cleanupRef = useRef([]);
  const lineRef = useRef('');
  const cursorPosRef = useRef(0);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

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

    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch { /* container not ready */ }
    });

    /** Rewrite the current input line (after backspace, arrow keys, history) */
    function redrawLine() {
      const line = lineRef.current;
      const pos = cursorPosRef.current;
      // Save cursor, move to start of input area, clear line, write input, restore position
      // We need to know where the prompt ends — track it
      term.write('\x1b[2K\r');
      // Re-print the shell prompt that was on this line (we can't — it's gone)
      // So just write the user input from column 0
      term.write(line);
      const backSteps = line.length - pos;
      if (backSteps > 0) {
        term.write(`\x1b[${backSteps}D`);
      }
    }

    // Spawn the shell
    window.electronAPI?.terminalSpawn({ id: sessionId }).then((result) => {
      if (!result?.success) {
        term.writeln(`\x1b[31mFailed to start shell: ${result?.error || 'Unknown error'}\x1b[0m`);
      }
    });

    // Shell output → xterm (pass through directly, no extra prompts)
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

    /** Handle keyboard input — local echo + line buffer */
    const onDataDisposable = term.onData((data) => {
      const session = useTerminalStore.getState().sessions.find(s => s.id === sessionId);
      if (session && !session.alive) return;

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
        window.electronAPI?.terminalWrite({ id: sessionId, data: line + '\n' });
        return;
      }

      // --- Backspace (\x7f or \b) ---
      if (data === '\x7f' || data === '\b') {
        if (cursorPosRef.current > 0) {
          const line = lineRef.current;
          const pos = cursorPosRef.current;
          lineRef.current = line.slice(0, pos - 1) + line.slice(pos);
          cursorPosRef.current = pos - 1;
          // Visual: move back, delete char, rewrite rest
          term.write('\b \b');
          const tail = lineRef.current.slice(cursorPosRef.current);
          if (tail.length > 0) {
            term.write(tail + ' ');
            term.write(`\x1b[${tail.length + 1}D`);
          }
        }
        return;
      }

      // --- Ctrl+C ---
      if (data === '\x03') {
        window.electronAPI?.terminalWrite({ id: sessionId, data: '\x03' });
        lineRef.current = '';
        cursorPosRef.current = 0;
        term.write('^C\r\n');
        return;
      }

      // --- Ctrl+L (clear) ---
      if (data === '\x0c') {
        term.clear();
        lineRef.current = '';
        cursorPosRef.current = 0;
        return;
      }

      // --- Escape sequences (arrows, home, end, delete) ---
      if (data.startsWith('\x1b')) {
        // Up arrow — previous history
        if (data === '\x1b[A') {
          const history = historyRef.current;
          if (history.length === 0) return;
          // Clear current input visually
          const oldLen = lineRef.current.length;
          if (oldLen > 0) {
            term.write(`\x1b[${cursorPosRef.current}D`);
            term.write(' '.repeat(oldLen));
            term.write(`\x1b[${oldLen}D`);
          }
          if (historyIndexRef.current === -1) {
            historyIndexRef.current = history.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
          }
          lineRef.current = history[historyIndexRef.current] || '';
          cursorPosRef.current = lineRef.current.length;
          term.write(lineRef.current);
          return;
        }

        // Down arrow — next history
        if (data === '\x1b[B') {
          if (historyIndexRef.current === -1) return;
          const history = historyRef.current;
          const oldLen = lineRef.current.length;
          if (oldLen > 0) {
            term.write(`\x1b[${cursorPosRef.current}D`);
            term.write(' '.repeat(oldLen));
            term.write(`\x1b[${oldLen}D`);
          }
          if (historyIndexRef.current < history.length - 1) {
            historyIndexRef.current++;
            lineRef.current = history[historyIndexRef.current] || '';
          } else {
            historyIndexRef.current = -1;
            lineRef.current = '';
          }
          cursorPosRef.current = lineRef.current.length;
          term.write(lineRef.current);
          return;
        }

        // Left arrow
        if (data === '\x1b[D') {
          if (cursorPosRef.current > 0) {
            cursorPosRef.current--;
            term.write(data);
          }
          return;
        }

        // Right arrow
        if (data === '\x1b[C') {
          if (cursorPosRef.current < lineRef.current.length) {
            cursorPosRef.current++;
            term.write(data);
          }
          return;
        }

        // Home
        if (data === '\x1b[H' || data === '\x1b[1~') {
          if (cursorPosRef.current > 0) {
            term.write(`\x1b[${cursorPosRef.current}D`);
            cursorPosRef.current = 0;
          }
          return;
        }

        // End
        if (data === '\x1b[F' || data === '\x1b[4~') {
          const move = lineRef.current.length - cursorPosRef.current;
          if (move > 0) {
            term.write(`\x1b[${move}C`);
            cursorPosRef.current = lineRef.current.length;
          }
          return;
        }

        // Delete key
        if (data === '\x1b[3~') {
          const pos = cursorPosRef.current;
          if (pos < lineRef.current.length) {
            lineRef.current = lineRef.current.slice(0, pos) + lineRef.current.slice(pos + 1);
            const tail = lineRef.current.slice(pos);
            term.write(tail + ' ');
            term.write(`\x1b[${tail.length + 1}D`);
          }
          return;
        }

        return; // ignore other escape sequences
      }

      // --- Regular printable characters ---
      if (data.charCodeAt(0) >= 32) {
        const pos = cursorPosRef.current;
        lineRef.current = lineRef.current.slice(0, pos) + data + lineRef.current.slice(pos);
        cursorPosRef.current = pos + data.length;
        // Echo the character + rewrite any text to the right
        const tail = lineRef.current.slice(cursorPosRef.current);
        term.write(data + tail);
        if (tail.length > 0) {
          term.write(`\x1b[${tail.length}D`);
        }
      }
    });

    // Resize observer
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
