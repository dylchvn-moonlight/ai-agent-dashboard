import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  Info,
  Cpu,
  Palette,
  Database,
  ChevronDown,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Link,
  Unlink,
  Plus,
  Radio,
  X,
  RotateCcw,
  ArrowDownToLine,
  Mail,
  Plug,
} from 'lucide-react';
import useUiStore from '@/stores/ui-store';
import useAgentStore from '@/stores/agent-store';

/* ─── credential key names (provider → singular key name) ─── */
const CRED_KEYS = {
  anthropic: 'anthropic-api-key',
  openai: 'openai-api-key',
  kimi: 'kimi-api-key',
  minimax: 'minimax-api-key',
  localUrl: 'local-endpoint-url',
};

/* ─── provider labels for the multi-key manager ─── */
const PROVIDER_LABELS = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  kimi: 'Kimi (Moonshot)',
  minimax: 'MiniMax',
};

/* ─── helpers ─── */
function maskValue(val) {
  if (!val) return '';
  if (val.length <= 8) return '*'.repeat(val.length);
  return val.slice(0, 4) + '*'.repeat(val.length - 8) + val.slice(-4);
}

/* ─── reusable section wrapper ─── */
function Section({ icon: Icon, title, children, tourId }) {
  return (
    <div className="bg-[var(--glass)] backdrop-blur-md border border-[var(--glassBd)] rounded-xl p-5" data-tour={tourId}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--blue)]" />
        <h2 className="text-sm font-semibold text-[var(--hd)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─── Multi-Key API Key Manager ─── */
function ApiKeyManager({ provider, placeholder }) {
  const label = PROVIDER_LABELS[provider] || provider;
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [visible, setVisible] = useState(false);
  const [keys, setKeys] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [loading, setLoading] = useState(true);

  // Load all keys on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await window.electronAPI?.loadAllKeys(provider);
        if (!cancelled && stored) {
          setKeys(stored);
        }
      } catch { /* not in Electron */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [provider]);

  const handleAddKey = async () => {
    if (!inputValue.trim()) return;
    setStatus('saving');
    try {
      const result = await window.electronAPI?.addKey(
        provider,
        inputLabel.trim() || `Key ${keys.length + 1}`,
        inputValue.trim()
      );
      if (result?.success) {
        // Reload keys
        const stored = await window.electronAPI?.loadAllKeys(provider);
        setKeys(stored || []);
        setInputValue('');
        setInputLabel('');
        setVisible(false);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      await window.electronAPI?.deleteKey(provider, keyId);
      const stored = await window.electronAPI?.loadAllKeys(provider);
      setKeys(stored || []);
    } catch { /* ignore */ }
  };

  const handleSetActive = async (keyId) => {
    try {
      await window.electronAPI?.setActiveKey(provider, keyId);
      const stored = await window.electronAPI?.loadAllKeys(provider);
      setKeys(stored || []);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[var(--sb)]">{label}</label>

      {/* Add key input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-32 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
          />
          <div className="relative flex-1">
            <input
              type={visible ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              placeholder={placeholder}
              className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dm)] hover:text-[var(--sb)] transition-colors"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleAddKey}
            disabled={!inputValue.trim() || status === 'saving'}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            {status === 'saving' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            Add Key
          </button>
        </div>
        {status === 'saved' && (
          <p className="text-[10px] text-[var(--green)]">Key saved in encrypted storage</p>
        )}
        {status === 'error' && (
          <p className="text-[10px] text-[var(--red)]">Failed to save — is the app running in Electron?</p>
        )}
      </div>

      {/* Saved keys list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--dm)]">
          <Loader2 size={12} className="animate-spin" />
          Loading keys...
        </div>
      ) : keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                k.isActive
                  ? 'border-[var(--blue)] bg-blue-500/5'
                  : 'border-[var(--glassBd)] bg-[var(--bg)]'
              }`}
            >
              {/* Active radio */}
              <button
                onClick={() => handleSetActive(k.id)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  k.isActive
                    ? 'border-[var(--blue)]'
                    : 'border-[var(--dm)] hover:border-[var(--sb)]'
                }`}
                title={k.isActive ? 'Active key' : 'Set as active'}
              >
                {k.isActive && (
                  <div className="w-2 h-2 rounded-full bg-[var(--blue)]" />
                )}
              </button>

              {/* Key info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--tx)] truncate">
                    {k.label}
                  </span>
                  {k.isActive && (
                    <span className="text-[9px] font-medium text-[var(--blue)] bg-blue-500/10 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--dm)] font-mono">
                  {k.masked}
                </span>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDeleteKey(k.id)}
                className="p-1 rounded hover:bg-red-500/10 text-[var(--dm)] hover:text-red-400 transition-colors"
                title="Delete key"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Local endpoint row (not multi-key — just a URL) ─── */
function LocalEndpointRow() {
  const [value, setValue] = useState('');
  const [masked, setMasked] = useState('');
  const [status, setStatus] = useState('idle');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await window.electronAPI?.loadCredential(CRED_KEYS.localUrl);
        if (!cancelled && stored) {
          setMasked(stored);
          setLoaded(true);
          setStatus('saved');
        }
      } catch { /* no stored value */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!value.trim()) return;
    setStatus('saving');
    try {
      await window.electronAPI?.saveCredential(CRED_KEYS.localUrl, value.trim());
      setMasked(value.trim());
      setLoaded(true);
      setValue('');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--sb)]">Custom / Local Endpoint URL</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status === 'saved') setStatus('idle');
          }}
          placeholder={loaded ? masked : 'http://localhost:11434/v1'}
          className="flex-1 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={!value.trim() || status === 'saving'}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
        <div className="flex items-center">
          {status === 'saved' && <Check size={14} className="text-[var(--green)]" />}
          {status === 'error' && <AlertCircle size={14} className="text-[var(--red)]" />}
        </div>
      </div>
    </div>
  );
}

/* ─── Integration Credential Row (single key per service) ─── */
function IntegrationCredentialRow({ credKey, label, placeholder, helpText }) {
  const [value, setValue] = useState('');
  const [masked, setMasked] = useState('');
  const [status, setStatus] = useState('idle');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await window.electronAPI?.loadCredential(credKey);
        if (!cancelled && stored) {
          setMasked(maskValue(stored));
          setStatus('saved');
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [credKey]);

  const handleSave = async () => {
    if (!value.trim()) return;
    setStatus('saving');
    try {
      await window.electronAPI?.saveCredential(credKey, value.trim());
      setMasked(maskValue(value.trim()));
      setValue('');
      setVisible(false);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--sb)]">{label}</label>
      {helpText && <p className="text-[10px] text-[var(--dm)]">{helpText}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => { setValue(e.target.value); if (status === 'saved') setStatus('idle'); }}
            placeholder={status === 'saved' ? masked : placeholder}
            className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors font-mono"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dm)] hover:text-[var(--sb)] transition-colors"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || status === 'saving'}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
        <div className="flex items-center w-5">
          {status === 'saved' && <Check size={14} className="text-[var(--green)]" />}
          {status === 'error' && <AlertCircle size={14} className="text-[var(--red)]" />}
        </div>
      </div>
    </div>
  );
}

/* ─── Dynamic Model Selector ─── */
function ModelSelector({ provider, model, onModelChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const fetchModels = useCallback(async () => {
    if (provider === 'local') {
      setManualMode(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI?.fetchModels(provider);
      if (result?.success) {
        setModels(result.models);
        setFetched(true);
        setManualMode(false);
        // If current model not in list, auto-select first
        if (result.models.length > 0 && !result.models.includes(model)) {
          onModelChange(result.models[0]);
        }
      } else {
        setError(result?.error || 'Failed to fetch models');
        setManualMode(true);
      }
    } catch (e) {
      setError(e.message);
      setManualMode(true);
    }
    setLoading(false);
  }, [provider, model, onModelChange]);

  useEffect(() => {
    setFetched(false);
    setModels([]);
    setError(null);
    setManualMode(provider === 'local');
    if (provider !== 'local') {
      fetchModels();
    }
  }, [provider]);

  if (manualMode || provider === 'local') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--sb)]">Default Model</label>
          {error && (
            <button
              onClick={fetchModels}
              className="flex items-center gap-1 text-[10px] text-[var(--blue)] hover:underline"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          )}
        </div>
        <input
          type="text"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder="Model name"
          className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
        />
        {error && (
          <p className="text-[10px] text-[var(--amber)]">Could not fetch models — using manual input</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--sb)]">Default Model</label>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] text-[var(--dm)] hover:text-[var(--blue)] transition-colors"
          title="Refresh model list"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      {loading && !fetched ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg">
          <Loader2 size={12} className="animate-spin text-[var(--dm)]" />
          <span className="text-xs text-[var(--dm)]">Loading models...</span>
        </div>
      ) : (
        <div className="relative">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full appearance-none bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors cursor-pointer"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dm)] pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}

/* ─── toggle switch ─── */
function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-[var(--blue)]' : 'bg-[var(--bd)]'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      {label && (
        <span className="text-xs text-[var(--tx)] group-hover:text-[var(--hd)] transition-colors">
          {label}
        </span>
      )}
    </button>
  );
}

/* ─── MiniMax dual-auth section ─── */
function MiniMaxAuthSection() {
  const [tab, setTab] = useState('apikey'); // 'apikey' | 'oauth'
  const [oauthStatus, setOauthStatus] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState(null);

  const [oauthAuthUrl, setOauthAuthUrl] = useState('https://api.minimax.io/v1/oauth/authorize');
  const [oauthTokenUrl, setOauthTokenUrl] = useState('https://api.minimax.io/v1/oauth/token');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await window.electronAPI?.getMiniMaxOAuthStatus();
        if (!cancelled && status) setOauthStatus(status);
      } catch { /* not in Electron */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOAuthStart = async () => {
    if (!oauthClientId.trim()) {
      setOauthError('Client ID is required');
      return;
    }
    setOauthLoading(true);
    setOauthError(null);
    try {
      const result = await window.electronAPI?.startMiniMaxOAuth({
        authUrl: oauthAuthUrl,
        tokenUrl: oauthTokenUrl,
        clientId: oauthClientId.trim(),
        clientSecret: oauthClientSecret.trim() || undefined,
      });
      if (result?.success) {
        setOauthStatus({ connected: true, expired: false, expiresAt: result.expiresAt, hasRefreshToken: true });
      } else {
        setOauthError(result?.error || 'OAuth failed');
      }
    } catch (e) {
      setOauthError(e.message || 'OAuth failed');
    }
    setOauthLoading(false);
  };

  const handleOAuthRefresh = async () => {
    setOauthLoading(true);
    setOauthError(null);
    try {
      const result = await window.electronAPI?.refreshMiniMaxOAuth();
      if (result?.success) {
        setOauthStatus((s) => ({ ...s, expired: false, expiresAt: result.expiresAt }));
      } else {
        setOauthError(result?.error || 'Refresh failed');
      }
    } catch (e) {
      setOauthError(e.message || 'Refresh failed');
    }
    setOauthLoading(false);
  };

  const handleOAuthDisconnect = async () => {
    setOauthLoading(true);
    try {
      await window.electronAPI?.disconnectMiniMaxOAuth();
      setOauthStatus({ connected: false, expired: false, expiresAt: null, hasRefreshToken: false });
    } catch { /* ignore */ }
    setOauthLoading(false);
    setOauthError(null);
  };

  const formatExpiry = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      <div className="flex gap-1 p-0.5 bg-[var(--bg)] rounded-lg w-fit">
        <button
          onClick={() => setTab('apikey')}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
            tab === 'apikey'
              ? 'bg-[var(--blue)] text-white'
              : 'text-[var(--dm)] hover:text-[var(--tx)]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Key size={11} />
            API Key
          </span>
        </button>
        <button
          onClick={() => setTab('oauth')}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
            tab === 'oauth'
              ? 'bg-[var(--blue)] text-white'
              : 'text-[var(--dm)] hover:text-[var(--tx)]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <LogIn size={11} />
            OAuth
            {oauthStatus?.connected && !oauthStatus?.expired && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            )}
          </span>
        </button>
      </div>

      {/* API Key tab — now uses multi-key manager */}
      {tab === 'apikey' && (
        <ApiKeyManager provider="minimax" placeholder="eyJhbG..." />
      )}

      {/* OAuth tab */}
      {tab === 'oauth' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-[var(--dm)] uppercase tracking-wider">OAuth Configuration</label>
            <input
              type="text"
              value={oauthAuthUrl}
              onChange={(e) => setOauthAuthUrl(e.target.value)}
              placeholder="Auth URL"
              className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-[11px] text-[var(--tx)] px-3 py-1.5 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
            <input
              type="text"
              value={oauthTokenUrl}
              onChange={(e) => setOauthTokenUrl(e.target.value)}
              placeholder="Token URL"
              className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-[11px] text-[var(--tx)] px-3 py-1.5 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
            <input
              type="text"
              value={oauthClientId}
              onChange={(e) => setOauthClientId(e.target.value)}
              placeholder="Client ID (required)"
              className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-[11px] text-[var(--tx)] px-3 py-1.5 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
            <input
              type="password"
              value={oauthClientSecret}
              onChange={(e) => setOauthClientSecret(e.target.value)}
              placeholder="Client Secret (optional)"
              className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-[11px] text-[var(--tx)] px-3 py-1.5 focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
          </div>

          {oauthStatus?.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${oauthStatus.expired ? 'bg-[var(--amber)]' : 'bg-[var(--green)]'}`} />
                <span className="text-xs text-[var(--tx)]">
                  {oauthStatus.expired ? 'Token expired' : 'Connected'}
                </span>
                {oauthStatus.expiresAt && (
                  <span className="text-[10px] text-[var(--dm)]">
                    {oauthStatus.expired ? 'Expired' : 'Expires'}: {formatExpiry(oauthStatus.expiresAt)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {oauthStatus.hasRefreshToken && (
                  <button
                    onClick={handleOAuthRefresh}
                    disabled={oauthLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--blue)] text-xs text-[var(--tx)] rounded-lg transition-colors disabled:opacity-40"
                  >
                    {oauthLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Refresh
                  </button>
                )}
                <button
                  onClick={handleOAuthDisconnect}
                  disabled={oauthLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--red)] text-xs text-[var(--red)] rounded-lg transition-colors disabled:opacity-40"
                >
                  <Unlink size={12} />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleOAuthStart}
              disabled={oauthLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {oauthLoading ? <Loader2 size={13} className="animate-spin" /> : <Link size={13} />}
              Sign in with MiniMax
            </button>
          )}

          {oauthError && (
            <p className="text-[10px] text-[var(--red)] flex items-center gap-1">
              <AlertCircle size={11} />
              {oauthError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Updates Section ─── */
function UpdatesSection() {
  const [status, setStatus] = useState('idle'); // idle | checking | available | downloading | ready | upToDate | error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [appVersion, setAppVersion] = useState('…');

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => v && setAppVersion(v));
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI?.onUpdateEvent?.((eventName, data) => {
      switch (eventName) {
        case 'update-available':
          setStatus('available');
          setUpdateInfo(data);
          break;
        case 'update-not-available':
          setStatus('upToDate');
          break;
        case 'download-progress':
          setStatus('downloading');
          setProgress(data?.percent || 0);
          break;
        case 'update-downloaded':
          setStatus('ready');
          break;
        case 'error':
          setStatus('error');
          setErrorMsg(data?.message || 'Update check failed');
          break;
      }
    });
    return () => cleanup?.();
  }, []);

  const handleCheck = async () => {
    setStatus('checking');
    setErrorMsg(null);
    const result = await window.electronAPI?.checkForUpdates?.();
    if (result && !result.success) {
      setStatus('error');
      setErrorMsg(result.error || 'Update check failed');
    }
    // If success, autoUpdater events will update the status
  };

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);
    await window.electronAPI?.downloadUpdate?.();
  };

  const handleInstall = async () => {
    await window.electronAPI?.installUpdate?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-[var(--tx)]">Current Version</span>
          <p className="text-sm font-mono text-[var(--hd)]">v{appVersion}</p>
        </div>
        <div className="flex gap-2">
          {status === 'idle' || status === 'upToDate' || status === 'error' ? (
            <button
              onClick={handleCheck}
              disabled={status === 'checking'}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--blue)] text-xs text-[var(--tx)] rounded-lg transition-colors disabled:opacity-40"
            >
              {status === 'checking' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Check for Updates
            </button>
          ) : null}
          {status === 'available' && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--blue)] hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowDownToLine size={12} />
              Download Update
            </button>
          )}
          {status === 'ready' && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--green)] hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowDownToLine size={12} />
              Install & Restart
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {status === 'upToDate' && (
        <p className="text-[10px] text-[var(--green)] flex items-center gap-1">
          <Check size={11} />
          You're up to date!
        </p>
      )}
      {status === 'available' && updateInfo && (
        <p className="text-xs text-[var(--amber)]">
          Update available: v{updateInfo.version || 'new'}
        </p>
      )}
      {status === 'downloading' && (
        <div className="space-y-1">
          <p className="text-[10px] text-[var(--dm)]">Downloading... {Math.round(progress)}%</p>
          <div className="w-full h-1.5 bg-[var(--bd)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--blue)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {status === 'ready' && (
        <p className="text-xs text-[var(--green)]">Update downloaded! Click "Install & Restart" to apply.</p>
      )}
      {status === 'error' && errorMsg && (
        <p className="text-[10px] text-[var(--red)] flex items-center gap-1">
          <AlertCircle size={11} />
          {errorMsg}
        </p>
      )}
    </div>
  );
}

/* ─── main component ─── */
export default function Settings() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const agents = useAgentStore((s) => s.agents);

  /* Model defaults state */
  const [provider, setProvider] = useState('claude');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [streaming, setStreaming] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  /* SMTP state */
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpTestStatus, setSmtpTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [smtpSaved, setSmtpSaved] = useState(false);

  /* n8n integration state */
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nKey, setN8nKey] = useState('');
  const [n8nKeyVisible, setN8nKeyVisible] = useState(false);
  const [n8nTestStatus, setN8nTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [n8nSaved, setN8nSaved] = useState(false);
  const [n8nTestError, setN8nTestError] = useState('');

  /* App version */
  const [aboutVersion, setAboutVersion] = useState('…');
  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => v && setAboutVersion(v));
  }, []);

  /* Data management state */
  const [confirmClear, setConfirmClear] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  /* Load persisted settings */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await window.electronAPI?.loadSettings();
        if (!cancelled && settings) {
          if (settings.provider) setProvider(settings.provider);
          if (settings.model) setModel(settings.model);
          if (settings.temperature != null) setTemperature(settings.temperature);
          if (settings.maxTokens != null) setMaxTokens(settings.maxTokens);
          if (settings.streaming != null) setStreaming(settings.streaming);
        }
      } catch {
        /* defaults are fine */
      }

      // Load n8n credentials
      const n8nUrlVal = await window.electronAPI?.loadCredential('n8n-api-url');
      const n8nKeyVal = await window.electronAPI?.loadCredential('n8n-api-key');
      if (!cancelled && n8nUrlVal) setN8nUrl(n8nUrlVal);
      if (!cancelled && n8nKeyVal) setN8nKey(n8nKeyVal);

      // Load SMTP credentials
      const smtpFields = ['smtp-host', 'smtp-port', 'smtp-secure', 'smtp-user', 'smtp-pass', 'smtp-from-name', 'smtp-from-email'];
      for (const key of smtpFields) {
        const val = await window.electronAPI?.loadCredential(key);
        if (!cancelled && val) {
          switch(key) {
            case 'smtp-host': setSmtpHost(val); break;
            case 'smtp-port': setSmtpPort(val); break;
            case 'smtp-secure': setSmtpSecure(val === 'true'); break;
            case 'smtp-user': setSmtpUser(val); break;
            case 'smtp-pass': setSmtpPass(val); break;
            case 'smtp-from-name': setSmtpFromName(val); break;
            case 'smtp-from-email': setSmtpFromEmail(val); break;
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Save model settings */
  const saveModelSettings = useCallback(async () => {
    const settings = { provider, model, temperature, maxTokens, streaming };
    try {
      await window.electronAPI?.saveSettings(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {
      /* fail silently in browser dev mode */
    }
  }, [provider, model, temperature, maxTokens, streaming]);

  /* Update model when provider changes */
  useEffect(() => {
    const defaults = {
      claude: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      minimax: 'MiniMax-M2.5',
      kimi: 'moonshot-v1-128k',
      local: 'default',
    };
    setModel(defaults[provider] || '');
  }, [provider]);

  /* Re-run tutorial handler */
  const handleRerunTutorial = async () => {
    try {
      const settings = await window.electronAPI?.loadSettings();
      await window.electronAPI?.saveSettings({
        ...settings,
        onboardingComplete: false,
      });
      window.location.reload();
    } catch { /* ignore */ }
  };

  /* Save SMTP settings */
  const saveSmtpSettings = async () => {
    const fields = {
      'smtp-host': smtpHost,
      'smtp-port': smtpPort,
      'smtp-secure': smtpSecure ? 'true' : 'false',
      'smtp-user': smtpUser,
      'smtp-pass': smtpPass,
      'smtp-from-name': smtpFromName,
      'smtp-from-email': smtpFromEmail,
    };
    for (const [key, value] of Object.entries(fields)) {
      await window.electronAPI?.saveCredential(key, value);
    }
    setSmtpSaved(true);
    setTimeout(() => setSmtpSaved(false), 2000);
  };

  /* Test SMTP connection */
  const testSmtpConnection = async () => {
    setSmtpTestStatus('testing');
    try {
      const result = await window.electronAPI?.testEmailConnection();
      setSmtpTestStatus(result?.success ? 'success' : 'error');
    } catch {
      setSmtpTestStatus('error');
    }
    setTimeout(() => setSmtpTestStatus(null), 4000);
  };

  /* Export agents */
  const handleExport = () => {
    const data = JSON.stringify(agents, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-agents-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* Import agents */
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        const store = useAgentStore.getState();
        imported.forEach((agent) => {
          if (agent.id && agent.name) {
            store.createAgent(agent);
          }
        });
        setImportStatus('success');
        setTimeout(() => setImportStatus(null), 3000);
      } catch {
        setImportStatus('error');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    input.click();
  };

  /* Clear all agents */
  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    const store = useAgentStore.getState();
    const ids = store.agents.map((a) => a.id);
    ids.forEach((id) => store.deleteAgent(id));
    setConfirmClear(false);
  };

  /* ─── render ─── */
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--hd)]">Settings</h1>
        <p className="text-sm text-[var(--dm)] mt-1">
          Manage API keys, model defaults, appearance, and data
        </p>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* ── 1. API Keys (Multi-Key) ── */}
        <Section icon={Key} title="API Keys" tourId="settings-api-keys">
          <div className="space-y-4">
            <ApiKeyManager provider="anthropic" placeholder="sk-ant-..." />

            <div className="border-t border-[var(--glassBd)] pt-4" />
            <ApiKeyManager provider="openai" placeholder="sk-..." />

            <div className="border-t border-[var(--glassBd)] pt-4" />
            <ApiKeyManager provider="kimi" placeholder="sk-..." />

            <div className="border-t border-[var(--glassBd)] pt-4" />
            <LocalEndpointRow />

            {/* MiniMax — dual auth */}
            <div className="border-t border-[var(--glassBd)] pt-4">
              <label className="text-xs font-medium text-[var(--sb)] block mb-2">MiniMax</label>
              <MiniMaxAuthSection />
            </div>
          </div>
          <p className="text-[10px] text-[var(--dm)] mt-4">
            Keys are stored in encrypted OS-level credential storage and never leave your device.
          </p>
        </Section>

        {/* ── Integration Credentials ── */}
        <Section icon={Plug} title="Integration Credentials">
          <div className="space-y-4">
            <IntegrationCredentialRow credKey="google-api-key" label="Google API Key" placeholder="AIzaSy..." helpText="Used by Gmail, Google Sheets, and YouTube nodes." />
            <div className="border-t border-[var(--glassBd)] pt-4" />
            <IntegrationCredentialRow credKey="slack-bot-token" label="Slack Bot Token" placeholder="xoxb-..." helpText="Used by Slack node. Create a bot at api.slack.com." />
            <div className="border-t border-[var(--glassBd)] pt-4" />
            <IntegrationCredentialRow credKey="telegram-bot-token" label="Telegram Bot Token" placeholder="123456:ABC-DEF..." helpText="Used by Telegram node. Get from @BotFather." />
            <div className="border-t border-[var(--glassBd)] pt-4" />
            <IntegrationCredentialRow credKey="airtable-api-key" label="Airtable API Key" placeholder="pat..." helpText="Used by Airtable node. Create a personal access token." />
          </div>
          <p className="text-[10px] text-[var(--dm)] mt-4">
            Integration credentials are encrypted and stored locally.
          </p>
        </Section>

        {/* ── Email / SMTP ── */}
        <Section icon={Mail} title="Email / SMTP">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--sb)]">Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="rounded border-[var(--glassBd)] bg-[var(--bg)]"
                  />
                  <span className="text-xs text-[var(--sb)]">Use TLS/SSL</span>
                </label>
              </div>
            </div>

            <div className="border-t border-[var(--glassBd)] pt-3" />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">Username / Email</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">Password / App Password</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
              />
            </div>

            <div className="border-t border-[var(--glassBd)] pt-3" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--sb)]">From Name</label>
                <input
                  type="text"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder="AI Agent"
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--sb)]">From Email</label>
                <input
                  type="text"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={saveSmtpSettings}
                className="flex items-center gap-1.5 px-4 py-2 bg-[var(--blue)] hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {smtpSaved ? <Check size={13} /> : <Save size={13} />}
                {smtpSaved ? 'Saved' : 'Save SMTP'}
              </button>
              <button
                onClick={testSmtpConnection}
                disabled={!smtpHost || !smtpUser || smtpTestStatus === 'testing'}
                className="flex items-center gap-1.5 px-4 py-2 border border-[var(--glassBd)] hover:border-[var(--blue)] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-[var(--tx)] rounded-lg transition-colors"
              >
                {smtpTestStatus === 'testing' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : smtpTestStatus === 'success' ? (
                  <Check size={13} className="text-[var(--green)]" />
                ) : smtpTestStatus === 'error' ? (
                  <AlertCircle size={13} className="text-[var(--red)]" />
                ) : (
                  <Mail size={13} />
                )}
                {smtpTestStatus === 'testing' ? 'Testing...' : smtpTestStatus === 'success' ? 'Connected!' : smtpTestStatus === 'error' ? 'Failed' : 'Test Connection'}
              </button>
            </div>

            <p className="text-[10px] text-[var(--dm)]">
              For Gmail, use an App Password (not your regular password). Enable 2FA in Google settings first.
            </p>
          </div>
        </Section>

        {/* ── n8n Integration ── */}
        <Section icon={Link} title="n8n Integration">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">n8n API URL</label>
              <input
                type="text"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="http://localhost:5678"
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
              />
              <p className="text-[10px] text-[var(--dm)]">
                Self-hosted: http://localhost:5678 — Cloud: https://your-instance.app.n8n.cloud
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">API Key</label>
              <div className="relative">
                <input
                  type={n8nKeyVisible ? 'text' : 'password'}
                  value={n8nKey}
                  onChange={(e) => setN8nKey(e.target.value)}
                  placeholder="n8n API key"
                  className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setN8nKeyVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dm)] hover:text-[var(--sb)] transition-colors"
                >
                  {n8nKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-[var(--dm)]">
                Generate at: n8n Settings &gt; n8n API &gt; Create API Key
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={async () => {
                  if (!n8nUrl.trim() || !n8nKey.trim()) return;
                  // Save first
                  await window.electronAPI?.saveCredential('n8n-api-url', n8nUrl.trim());
                  await window.electronAPI?.saveCredential('n8n-api-key', n8nKey.trim());
                  setN8nSaved(true);
                  setTimeout(() => setN8nSaved(false), 2000);
                }}
                disabled={!n8nUrl.trim() || !n8nKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
              >
                {n8nSaved ? <Check size={13} /> : <Save size={13} />}
                {n8nSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={async () => {
                  if (!n8nUrl.trim() || !n8nKey.trim()) return;
                  setN8nTestStatus('testing');
                  setN8nTestError('');
                  // Save before testing
                  await window.electronAPI?.saveCredential('n8n-api-url', n8nUrl.trim());
                  await window.electronAPI?.saveCredential('n8n-api-key', n8nKey.trim());
                  const result = await window.electronAPI?.n8nTestConnection();
                  if (result?.success) {
                    setN8nTestStatus('success');
                  } else {
                    setN8nTestStatus('error');
                    setN8nTestError(result?.error || 'Connection failed');
                  }
                  setTimeout(() => setN8nTestStatus(null), 4000);
                }}
                disabled={!n8nUrl.trim() || !n8nKey.trim() || n8nTestStatus === 'testing'}
                className="flex items-center gap-1.5 px-4 py-2 border border-[var(--glassBd)] hover:border-[var(--blue)] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-[var(--tx)] rounded-lg transition-colors"
              >
                {n8nTestStatus === 'testing' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : n8nTestStatus === 'success' ? (
                  <Check size={13} className="text-[var(--green)]" />
                ) : n8nTestStatus === 'error' ? (
                  <AlertCircle size={13} className="text-[var(--red)]" />
                ) : (
                  <Plug size={13} />
                )}
                {n8nTestStatus === 'testing' ? 'Testing...' : n8nTestStatus === 'success' ? 'Connected!' : n8nTestStatus === 'error' ? 'Failed' : 'Test Connection'}
              </button>
            </div>

            {n8nTestStatus === 'success' && (
              <p className="text-[10px] text-[var(--green)]">Successfully connected to n8n instance.</p>
            )}
            {n8nTestStatus === 'error' && n8nTestError && (
              <p className="text-[10px] text-[var(--red)]">{n8nTestError}</p>
            )}
          </div>
        </Section>

        {/* ── 2. Default Model Settings ── */}
        <Section icon={Cpu} title="Default Model Settings" tourId="settings-models">
          <div className="space-y-4">
            {/* Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">Default Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full appearance-none bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 pr-8 focus:outline-none focus:border-[var(--blue)] transition-colors cursor-pointer"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI</option>
                  <option value="kimi">Kimi (Moonshot)</option>
                  <option value="minimax">MiniMax</option>
                  <option value="local">Local / Custom</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dm)] pointer-events-none"
                />
              </div>
            </div>

            {/* Dynamic Model Selector */}
            <ModelSelector
              provider={provider}
              model={model}
              onModelChange={setModel}
            />

            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--sb)]">Temperature</label>
                <span className="text-xs font-mono text-[var(--blue)]">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-[var(--bd)] accent-[var(--blue)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--blue)] [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--dm)]">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--sb)]">Max Tokens</label>
              <input
                type="number"
                min="1"
                max="200000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[var(--bg)] border border-[var(--glassBd)] rounded-lg text-xs text-[var(--tx)] px-3 py-2 focus:outline-none focus:border-[var(--blue)] transition-colors"
              />
            </div>

            {/* Streaming */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[var(--sb)]">Streaming</span>
                <p className="text-[10px] text-[var(--dm)] mt-0.5">
                  Stream tokens as they are generated
                </p>
              </div>
              <Toggle checked={streaming} onChange={setStreaming} />
            </div>

            {/* Save button */}
            <button
              onClick={saveModelSettings}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--blue)] hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {settingsSaved ? <Check size={13} /> : <Save size={13} />}
              {settingsSaved ? 'Saved' : 'Save Model Defaults'}
            </button>
          </div>
        </Section>

        {/* ── 3. Appearance ── */}
        <Section icon={Palette} title="Appearance">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon size={16} className="text-[var(--purple)]" />
              ) : (
                <Sun size={16} className="text-[var(--amber)]" />
              )}
              <div>
                <span className="text-xs font-medium text-[var(--tx)]">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <p className="text-[10px] text-[var(--dm)] mt-0.5">
                  Switch between dark and light themes
                </p>
              </div>
            </div>
            <Toggle
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
          </div>
        </Section>

        {/* ── 4. Data Management ── */}
        <Section icon={Database} title="Data Management" tourId="settings-data">
          <div className="space-y-3">
            {/* Export */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[var(--tx)]">Export Agents</span>
                <p className="text-[10px] text-[var(--dm)] mt-0.5">
                  Download all agents as a JSON file
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={agents.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--blue)] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-[var(--tx)] rounded-lg transition-colors"
              >
                <Download size={13} />
                Export
              </button>
            </div>

            <div className="border-t border-[var(--glassBd)]" />

            {/* Import */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[var(--tx)]">Import Agents</span>
                <p className="text-[10px] text-[var(--dm)] mt-0.5">
                  Load agents from a JSON file
                  {importStatus === 'success' && (
                    <span className="ml-2 text-[var(--green)]">Imported successfully</span>
                  )}
                  {importStatus === 'error' && (
                    <span className="ml-2 text-[var(--red)]">Invalid file format</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleImport}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--blue)] text-xs text-[var(--tx)] rounded-lg transition-colors"
              >
                <Upload size={13} />
                Import
              </button>
            </div>

            <div className="border-t border-[var(--glassBd)]" />

            {/* Clear */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[var(--tx)]">Clear All Data</span>
                <p className="text-[10px] text-[var(--dm)] mt-0.5">
                  {confirmClear
                    ? 'Click again to confirm -- this cannot be undone'
                    : 'Permanently delete all agents and their data'}
                </p>
              </div>
              <button
                onClick={handleClearAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs rounded-lg transition-colors ${
                  confirmClear
                    ? 'border-[var(--red)] bg-[var(--red)] text-white'
                    : 'border-[var(--glassBd)] hover:border-[var(--red)] text-[var(--red)]'
                }`}
              >
                <Trash2 size={13} />
                {confirmClear ? 'Confirm Delete' : 'Clear All'}
              </button>
            </div>
          </div>
        </Section>

        {/* ── 5. Updates ── */}
        <Section icon={ArrowDownToLine} title="Updates">
          <UpdatesSection />
        </Section>

        {/* ── 6. About ── */}
        <Section icon={Info} title="About">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--sb)]">Application</span>
                <span className="text-xs font-medium text-[var(--tx)]">AI Agent Dashboard</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--sb)]">Version</span>
                <span className="text-xs font-mono text-[var(--tx)]">{aboutVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--sb)]">Runtime</span>
                <span className="text-xs font-mono text-[var(--tx)]">Electron + React</span>
              </div>
            </div>
            <div className="border-t border-[var(--glassBd)] pt-3">
              <button
                onClick={handleRerunTutorial}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glassBd)] hover:border-[var(--blue)] text-xs text-[var(--tx)] rounded-lg transition-colors"
              >
                <RotateCcw size={12} />
                Re-run Tutorial
              </button>
            </div>
          </div>
        </Section>

        {/* bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
