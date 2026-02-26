/**
 * prebuild-pty.js — Pre-build helper for node-pty on Windows.
 *
 * Solves two problems that prevent `electron-builder --win` from succeeding in WSL:
 *
 * 1. Downloads the correct Windows prebuilt `conpty.node` binary from the
 *    @homebridge/node-pty-prebuilt-multiarch GitHub releases (if not already present).
 *    The npm package only ships Linux prebuilds; Windows binaries are normally
 *    compiled from source via binding.gyp during `npm install`, which fails in WSL
 *    without Visual Studio Build Tools.
 *
 * 2. Renames `binding.gyp` → `binding.gyp.bak` so that @electron/rebuild
 *    (invoked by electron-builder) won't detect the module as a native addon
 *    and attempt to recompile it.
 *
 * Run this BEFORE electron-builder in the dist pipeline:
 *   vite build && node scripts/prebuild-pty.js && electron-builder --win
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

// ── Config ──────────────────────────────────────────────────────────────
const PTY_PKG = '@homebridge/node-pty-prebuilt-multiarch';
const PTY_ROOT = path.join(__dirname, '..', 'node_modules', PTY_PKG);
const BINDING_GYP = path.join(PTY_ROOT, 'binding.gyp');
const BINDING_BAK = path.join(PTY_ROOT, 'binding.gyp.bak');
const BUILD_RELEASE = path.join(PTY_ROOT, 'build', 'Release');
const CONPTY_NODE = path.join(BUILD_RELEASE, 'conpty.node');

// Electron 28.3.3 → ABI 119, targeting win32-x64
// NOTE: v0.11.14 dropped the electron-v119 prebuild; v0.11.13 still has it.
// The binary is ABI-compatible with the installed 0.11.14 package.
const PREBUILD_VERSION = '0.11.13';
const RELEASE_TAG = `v${PREBUILD_VERSION}`;
const ASSET_NAME = `node-pty-prebuilt-multiarch-${RELEASE_TAG}-electron-v119-win32-x64.tar.gz`;
const DOWNLOAD_URL = `https://github.com/homebridge/node-pty-prebuilt-multiarch/releases/download/${RELEASE_TAG}/${ASSET_NAME}`;

// ── Helpers ─────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[prebuild-pty] ${msg}`);
}

function followRedirects(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        followRedirects(res.headers.location).then(resolve, reject);
      } else if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      } else {
        resolve(res);
      }
    }).on('error', reject);
  });
}

function downloadAndExtract(url, destDir) {
  return new Promise(async (resolve, reject) => {
    try {
      log(`Downloading ${url}`);
      const res = await followRedirects(url);

      const tmpTar = path.join(destDir, '_prebuild.tar.gz');
      const ws = fs.createWriteStream(tmpTar);
      res.pipe(ws);

      ws.on('finish', () => {
        ws.close();
        try {
          log(`Extracting to ${destDir}`);
          execFileSync('tar', ['xzf', tmpTar, '-C', destDir], { stdio: 'pipe' });
          fs.unlinkSync(tmpTar);
          resolve();
        } catch (err) {
          reject(new Error(`tar extract failed: ${err.message}`));
        }
      });

      ws.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  log(`Prebuild version: ${PREBUILD_VERSION} (release ${RELEASE_TAG})`);
  log(`Package root: ${PTY_ROOT}`);

  // Step 1: Ensure build/Release/conpty.node exists
  if (fs.existsSync(CONPTY_NODE)) {
    log('conpty.node already present — skipping download.');
  } else {
    log('conpty.node not found — downloading Windows prebuilt...');
    // Tarball contains build/Release/conpty.node, so extract to PTY_ROOT
    fs.mkdirSync(BUILD_RELEASE, { recursive: true });

    try {
      await downloadAndExtract(DOWNLOAD_URL, PTY_ROOT);
    } catch (err) {
      log(`Download failed: ${err.message}`);
      log('');
      log('Fallback: manually place conpty.node at:');
      log(`  ${CONPTY_NODE}`);
      log('');
      log('Download from:');
      log(`  https://github.com/homebridge/node-pty-prebuilt-multiarch/releases/tag/${RELEASE_TAG}`);
      process.exit(1);
    }

    // The tarball extracts with a nested structure — find conpty.node
    // and move it to the right place if needed.
    if (!fs.existsSync(CONPTY_NODE)) {
      const found = findFile(BUILD_RELEASE, 'conpty.node');
      if (found) {
        log(`Found conpty.node at ${found} — moving to ${CONPTY_NODE}`);
        fs.copyFileSync(found, CONPTY_NODE);
      } else {
        log('ERROR: conpty.node not found after extraction.');
        log('The tarball structure may have changed. Extract manually.');
        process.exit(1);
      }
    }

    log('conpty.node installed successfully.');
  }

  // Step 2: Rename binding.gyp to prevent @electron/rebuild detection
  if (fs.existsSync(BINDING_GYP)) {
    log('Renaming binding.gyp → binding.gyp.bak');
    fs.renameSync(BINDING_GYP, BINDING_BAK);
  } else if (fs.existsSync(BINDING_BAK)) {
    log('binding.gyp already renamed — nothing to do.');
  } else {
    log('Warning: binding.gyp not found (and no .bak either).');
  }

  log('Done — ready for electron-builder.');
}

function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = findFile(full, name);
      if (result) return result;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

main().catch((err) => {
  console.error('[prebuild-pty] Fatal error:', err);
  process.exit(1);
});
