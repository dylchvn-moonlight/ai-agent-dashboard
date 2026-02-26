/**
 * terminal-manager.js — Manages child_process shell sessions for the embedded terminal.
 *
 * Each session spawns a real shell (PowerShell on Windows, bash on Linux/macOS)
 * and exposes stdin/stdout/stderr through a simple API that the IPC layer calls.
 *
 * Uses child_process.spawn (no native deps) instead of node-pty.
 * Without a PTY, the renderer implements its own line buffer + local echo.
 */

const { spawn } = require('child_process');
const os = require('os');

class TerminalManager {
  constructor() {
    /** @type {Map<string, import('child_process').ChildProcess>} */
    this.sessions = new Map();
  }

  /**
   * Detect the default shell for the current platform.
   * Uses cmd.exe on Windows — it handles piped stdin line-by-line reliably
   * without a PTY. Users can type `powershell` to switch if needed.
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
   * Spawn a new shell session.
   * @param {string} id — unique session identifier
   * @param {object} opts
   * @param {string} [opts.shell] — shell executable override
   * @param {string} [opts.cwd] — working directory override
   * @returns {{ success: boolean, error?: string, shell?: string }}
   */
  spawn(id, { shell, cwd } = {}) {
    if (this.sessions.has(id)) {
      return { success: false, error: `Session ${id} already exists` };
    }

    const shellCmd = shell || this.getDefaultShell();
    const workDir = cwd || this.getDefaultCwd();

    // Shell-specific args for piped stdin mode
    const args = [];
    if (shellCmd.includes('cmd')) {
      args.push('/Q', '/K'); // /Q = echo off (renderer handles echo), /K = stay alive
    } else if (shellCmd.includes('powershell') || shellCmd.includes('pwsh')) {
      args.push('-NoLogo', '-NoProfile');
    }
    // bash/zsh: no special args needed for piped stdin

    try {
      const proc = spawn(shellCmd, args, {
        cwd: workDir,
        env: { ...process.env, TERM: 'xterm-256color' },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      // Handle spawn errors (e.g. shell not found)
      proc.on('error', (err) => {
        console.error(`Terminal ${id} spawn error:`, err.message);
      });

      this.sessions.set(id, proc);
      return { success: true, pid: proc.pid, shell: shellCmd };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Write data to a session's stdin.
   * The renderer sends complete lines (already has \n appended).
   */
  write(id, data) {
    const proc = this.sessions.get(id);
    if (!proc || proc.killed) return false;
    try {
      proc.stdin.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resize — no-op for child_process (no PTY). Placeholder for future node-pty upgrade.
   */
  resize(id, cols, rows) {
    return true;
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
   * Get the child process for a session (used by IPC to attach listeners).
   */
  getProcess(id) {
    return this.sessions.get(id) || null;
  }
}

module.exports = TerminalManager;
