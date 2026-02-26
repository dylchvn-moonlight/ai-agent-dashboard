/**
 * terminal-manager.js — Manages PTY shell sessions for the embedded terminal.
 *
 * Each session spawns a real PTY (pseudo-terminal) via node-pty,
 * giving child processes full terminal capabilities: echo, line editing,
 * signals, resize, isatty()=true, colors, tab completion, etc.
 */

const pty = require('@homebridge/node-pty-prebuilt-multiarch');
const os = require('os');

class TerminalManager {
  constructor() {
    /** @type {Map<string, import('@homebridge/node-pty-prebuilt-multiarch').IPty>} */
    this.sessions = new Map();
  }

  /**
   * Detect the default shell for the current platform.
   */
  getDefaultShell() {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * Default working directory — user home.
   */
  getDefaultCwd() {
    return os.homedir();
  }

  /**
   * Spawn a new PTY session.
   * @param {string} id — unique session identifier
   * @param {object} opts
   * @param {string} [opts.shell] — shell executable override
   * @param {string} [opts.cwd] — working directory override
   * @param {number} [opts.cols] — initial column count (default 80)
   * @param {number} [opts.rows] — initial row count (default 24)
   * @returns {{ success: boolean, error?: string, shell?: string, pid?: number }}
   */
  spawn(id, { shell, cwd, cols = 80, rows = 24 } = {}) {
    if (this.sessions.has(id)) {
      return { success: false, error: `Session ${id} already exists` };
    }

    const shellCmd = shell || this.getDefaultShell();
    const workDir = cwd || this.getDefaultCwd();

    try {
      const proc = pty.spawn(shellCmd, [], {
        name: 'xterm-256color',
        cwd: workDir,
        env: { ...process.env, TERM: 'xterm-256color' },
        cols,
        rows,
      });

      this.sessions.set(id, proc);
      return { success: true, pid: proc.pid, shell: shellCmd };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Write data to a session's PTY.
   * Raw keystrokes from xterm.js are forwarded directly — the PTY
   * line discipline handles echo, editing, and signal generation.
   */
  write(id, data) {
    const proc = this.sessions.get(id);
    if (!proc) return false;
    try {
      proc.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resize a session's PTY. The kernel notifies the child process
   * via SIGWINCH so it can redraw (e.g. vim, htop, less).
   */
  resize(id, cols, rows) {
    const proc = this.sessions.get(id);
    if (!proc) return false;
    try {
      proc.resize(cols, rows);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kill a specific session.
   */
  kill(id) {
    const proc = this.sessions.get(id);
    if (!proc) return false;
    try {
      proc.kill();
    } catch { /* already dead */ }
    this.sessions.delete(id);
    return true;
  }

  /**
   * Kill all sessions — called on app quit.
   */
  killAll() {
    for (const [id, proc] of this.sessions) {
      try {
        proc.kill();
      } catch { /* ignore */ }
    }
    this.sessions.clear();
  }

  /**
   * Get the PTY process for a session (used by IPC to attach listeners).
   */
  getProcess(id) {
    return this.sessions.get(id) || null;
  }
}

module.exports = TerminalManager;
