import {
  createDefaultSave,
  loadSave,
  mergeSaveData,
  readLegacySave,
  saveProgress,
  sanitizeSave
} from './save.js';

export const CLOUD_SAVE_KEY = 'cube-rush-3d-profile-v2';

const SAVE_DEBOUNCE_MS = 700;
const INITIAL_RETRY_MS = 2500;
const MAX_RETRY_MS = 60000;
const SDK_INIT_TIMEOUT_MS = 5000;
const MAX_CLOUD_GHOST_SAMPLES = 8000;
export const MAX_CLOUD_SAVE_BYTES = 900 * 1024;

export function serializeCloudSave(save) {
  const snapshot = JSON.parse(JSON.stringify(save));
  const originalSamples = snapshot.ghost?.bestRun?.samples;
  if (Array.isArray(originalSamples) && originalSamples.length > MAX_CLOUD_GHOST_SAMPLES) {
    const lastIndex = originalSamples.length - 1;
    snapshot.ghost.bestRun.samples = Array.from({ length: MAX_CLOUD_GHOST_SAMPLES }, (_, index) => (
      originalSamples[Math.round((index * lastIndex) / (MAX_CLOUD_GHOST_SAMPLES - 1))]
    ));
  }

  let serialized = JSON.stringify(snapshot);
  while (new TextEncoder().encode(serialized).byteLength > MAX_CLOUD_SAVE_BYTES) {
    const samples = snapshot.ghost?.bestRun?.samples;
    if (!Array.isArray(samples) || samples.length <= 2) {
      throw new Error(`Cloud save exceeds the ${MAX_CLOUD_SAVE_BYTES}-byte safety limit`);
    }
    const original = Array.isArray(originalSamples) ? originalSamples : samples;
    const nextLength = Math.max(2, Math.floor(samples.length / 2));
    const lastIndex = original.length - 1;
    snapshot.ghost.bestRun.samples = Array.from({ length: nextLength }, (_, index) => (
      original[Math.round((index * lastIndex) / (nextLength - 1))]
    ));
    serialized = JSON.stringify(snapshot);
  }
  return serialized;
}

export class SaveManager {
  constructor(onStatusChange = () => {}, onSaveReconciled = () => {}, { sdkInitTimeoutMs = SDK_INIT_TIMEOUT_MS } = {}) {
    this.onStatusChange = onStatusChange;
    this.onSaveReconciled = onSaveReconciled;
    this.sdkInitTimeoutMs = sdkInitTimeoutMs;
    this.status = 'loading';
    this.sdk = null;
    this.sdkInitialized = false;
    this.mode = 'uninitialized';
    this.hadLoadFailure = false;
    this.sdkInitPromise = null;
    this.data = null;
    this.readComplete = false;
    this.latestSave = null;
    this.pendingValue = null;
    this.lastSyncedValue = null;
    this.connectingPromise = null;
    this.inFlight = null;
    this.retryAttempts = 0;
    this.retryTimer = null;
    this.saveTimer = null;
    this.onOnline = () => this.retryPending();
    this.onPageHide = () => { void this.flush(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('pagehide', this.onPageHide);
    }
  }

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.onStatusChange(status);
  }

  connect(sdk, initialSave = null) {
    if (this.connectingPromise) return this.connectingPromise;
    this.connectingPromise = this.connectInternal(sdk, initialSave).finally(() => {
      this.connectingPromise = null;
    });
    return this.connectingPromise;
  }

  async connectInternal(sdk, initialSave = null) {
    this.sdk = sdk;
    if (!sdk || typeof sdk.init !== 'function') {
      const environment = this.readEnvironment(sdk);
      if (environment === 'crazygames' || (environment !== 'local' && this.isCrazyGamesHost())) {
        this.mode = 'unavailable';
        this.latestSave = createDefaultSave();
        this.setStatus('offline');
        return { connected: false, save: this.latestSave, environment: 'unavailable' };
      }
      if (environment !== 'local' && sdk) {
        this.mode = 'unavailable';
        this.latestSave = createDefaultSave();
        this.setStatus('offline');
        return { connected: false, save: this.latestSave, environment: 'unavailable' };
      }
      return this.initializeLocal(initialSave);
    }

    const detectedBeforeInit = this.readEnvironment(sdk) === 'crazygames';
    try {
      if (!this.sdkInitPromise) this.sdkInitPromise = Promise.resolve().then(() => sdk.init());
      let timeout;
      try {
        await Promise.race([
          this.sdkInitPromise,
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('CrazyGames SDK initialization timed out')), this.sdkInitTimeoutMs);
          })
        ]);
      } finally {
        clearTimeout(timeout);
      }
      this.sdkInitialized = true;
    } catch (error) {
      console.warn('CrazyGames SDK initialization failed', error);
      this.sdkInitPromise = null;
      const environment = this.readEnvironment(sdk);
      if (detectedBeforeInit || (environment !== 'local' && environment !== null)) {
        this.mode = 'crazygames';
        this.hadLoadFailure = true;
        this.latestSave = initialSave || createDefaultSave();
        this.readComplete = false;
        this.setStatus('error');
        this.scheduleRetry();
        return { connected: false, save: this.latestSave, environment: 'crazygames', sdkInitialized: false };
      }
      if (environment !== 'local') {
        this.mode = 'unavailable';
        this.latestSave = initialSave || createDefaultSave();
        this.setStatus('offline');
        return { connected: false, save: this.latestSave, environment: 'unavailable', sdkInitialized: false };
      }
      return this.initializeLocal(initialSave);
    }

    const environment = this.readEnvironment(sdk);
    if (environment === 'local') {
      return this.initializeLocal(initialSave);
    }
    if (environment !== 'crazygames') {
      this.mode = 'unavailable';
      this.latestSave = initialSave || createDefaultSave();
      this.setStatus('offline');
      return { connected: false, save: this.latestSave, environment: 'unavailable', sdkInitialized: true };
    }

    this.mode = 'crazygames';
    return this.loadAuthoritativeSave(initialSave);
  }

  readEnvironment(sdk) {
    try {
      return sdk?.environment;
    } catch (error) {
      console.warn('CrazyGames environment could not be detected', error);
      return null;
    }
  }

  isCrazyGamesHost() {
    try {
      return typeof window !== 'undefined'
        && /(^|\.)crazygames\.com$/i.test(window.location.hostname);
    } catch (error) {
      console.warn('CrazyGames host could not be detected', error);
      return false;
    }
  }

  initializeLocal(initialSave) {
    this.mode = 'local';
    this.readComplete = true;
    this.data = null;
    this.latestSave = loadSave();
    this.setStatus('local');
    return Promise.resolve({ connected: false, save: this.latestSave, environment: 'local' });
  }

  persist(save, { touchTimestamp = true } = {}) {
    if (touchTimestamp) save.updatedAt = Date.now();
    this.latestSave = save;
    if (this.mode === 'local') {
      const saved = saveProgress(save, { touchTimestamp: false });
      this.setStatus(saved ? 'local' : 'local-error');
      return saved;
    }
    if (this.mode === 'unavailable') {
      this.latestSave = save;
      this.setStatus('offline');
      return true;
    }
    if (this.mode !== 'crazygames') return false;
    return this.schedule(save);
  }

  loadCurrent() {
    return this.latestSave || createDefaultSave();
  }

  async loadAuthoritativeSave(initialSave) {
    this.setStatus('loading');
    try {
      const data = this.sdk?.data;
      if (typeof data?.getItem !== 'function' || typeof data?.setItem !== 'function') {
        throw new Error('CrazyGames Data Module is unavailable');
      }
      this.data = data;
      const storedValue = await Promise.resolve(data.getItem(CLOUD_SAVE_KEY));

      if (storedValue !== null && storedValue !== undefined && storedValue !== '') {
        const cloudSave = sanitizeSave(this.parseCloudSave(storedValue));
        const saved = this.hadLoadFailure
          ? mergeSaveData(initialSave || this.latestSave || cloudSave, cloudSave)
          : cloudSave;
        this.latestSave = saved;
        this.readComplete = true;
        const serialized = serializeCloudSave(saved);
        if (serialized !== serializeCloudSave(cloudSave)) {
          this.pendingValue = serialized;
          this.setStatus('saving');
          await this.flush();
        } else {
          this.lastSyncedValue = serialized;
          this.setStatus('loaded');
        }
        this.hadLoadFailure = false;
        return { connected: true, save: saved, environment: 'crazygames', sdkInitialized: true };
      }

      const legacy = readLegacySave();
      const candidate = this.hadLoadFailure && this.latestSave
        ? sanitizeSave(this.latestSave)
        : (legacy.valid ? legacy.save : (initialSave ? sanitizeSave(initialSave) : createDefaultSave()));
      const migrationRaceValue = await Promise.resolve(data.getItem(CLOUD_SAVE_KEY));
      if (migrationRaceValue !== null && migrationRaceValue !== undefined && migrationRaceValue !== '') {
        const cloudSave = sanitizeSave(this.parseCloudSave(migrationRaceValue));
        const saved = this.hadLoadFailure
          ? mergeSaveData(initialSave || this.latestSave || cloudSave, cloudSave)
          : cloudSave;
        this.latestSave = saved;
        this.readComplete = true;
        this.lastSyncedValue = serializeCloudSave(cloudSave);
        this.hadLoadFailure = false;
        if (serializeCloudSave(saved) !== this.lastSyncedValue) {
          this.pendingValue = serializeCloudSave(saved);
          await this.flush();
        } else {
          this.setStatus('loaded');
        }
        return { connected: true, save: saved, environment: 'crazygames', sdkInitialized: true };
      }
      this.latestSave = candidate;
      this.readComplete = true;
      const migrationValue = serializeCloudSave(candidate);
      this.pendingValue = migrationValue;
      const migrated = await this.writeAndVerifyMigration(migrationValue);
      if (!migrated) {
        this.hadLoadFailure = true;
        this.readComplete = false;
        this.setStatus('error');
        this.scheduleRetry();
        return { connected: false, save: candidate, environment: 'crazygames' };
      }
      this.lastSyncedValue = migrationValue;
      this.hadLoadFailure = false;
      this.pendingValue = null;
      this.setStatus('saved');
      return { connected: true, save: candidate, migrated: legacy.valid, environment: 'crazygames', sdkInitialized: true };
    } catch (error) {
      console.warn('CrazyGames authoritative save load failed', error);
      this.readComplete = false;
      this.hadLoadFailure = true;
      this.latestSave = initialSave ? sanitizeSave(initialSave) : (this.latestSave || createDefaultSave());
      this.pendingValue = null;
      this.setStatus('error');
      this.scheduleRetry();
      return { connected: false, save: this.latestSave, environment: 'crazygames', sdkInitialized: true };
    }
  }

  parseCloudSave(value) {
    if (typeof value !== 'string') {
      throw new Error('CrazyGames cloud save has an unsupported format');
    }
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('CrazyGames cloud save contains invalid data');
    }
    return parsed;
  }

  async writeAndVerifyMigration(value) {
    try {
      await Promise.resolve(this.data.setItem(CLOUD_SAVE_KEY, value));
      const verified = await Promise.resolve(this.data.getItem(CLOUD_SAVE_KEY));
      if (typeof verified !== 'string') return false;
      return serializeCloudSave(sanitizeSave(this.parseCloudSave(verified))) === value;
    } catch (error) {
      console.warn('CrazyGames local save migration could not be verified', error);
      return false;
    }
  }

  schedule(save) {
    this.latestSave = save;
    if (this.mode !== 'crazygames') return false;
    try {
      this.pendingValue = serializeCloudSave(save);
    } catch (error) {
      console.warn('CrazyGames cloud save could not be serialized; progress remains in memory', error);
      this.setStatus('error');
      return false;
    }
    if (!this.readComplete || !this.data) {
      this.setStatus('error');
      this.scheduleRetry();
      return true;
    }
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.setStatus('saving');
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
    return true;
  }

  async flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.inFlight) return this.inFlight;
    if (!this.data || !this.pendingValue) return false;
    if (!this.readComplete) {
      this.scheduleRetry();
      return false;
    }
    const value = this.pendingValue;
    this.pendingValue = null;
    this.setStatus('saving');
    this.inFlight = Promise.resolve().then(async () => {
      try {
        const latestCloudValue = await Promise.resolve(this.data.getItem(CLOUD_SAVE_KEY));
        let latestCloudSave = null;
        if (latestCloudValue !== null && latestCloudValue !== undefined) {
          if (typeof latestCloudValue !== 'string') {
            throw new Error('CrazyGames cloud save has an unsupported format');
          }
          latestCloudSave = JSON.parse(latestCloudValue);
          if (!latestCloudSave || typeof latestCloudSave !== 'object' || Array.isArray(latestCloudSave)) {
            throw new Error('CrazyGames cloud save contains invalid data');
          }
        }

        const pendingSave = JSON.parse(value);
        const currentSave = this.latestSave || pendingSave;
        const mergedInSession = mergeSaveData(pendingSave, currentSave);
        const mergedSave = latestCloudSave
          ? mergeSaveData(mergedInSession, latestCloudSave)
          : mergedInSession;
        const mergedValue = serializeCloudSave(mergedSave);
        this.latestSave = mergedSave;
        if (mergedValue !== value) {
          try {
            this.onSaveReconciled(mergedSave);
          } catch (error) {
            console.error('Unable to apply the reconciled cloud save locally', error);
          }
        }
        if (mergedValue !== latestCloudValue) {
          await Promise.resolve(this.data.setItem(CLOUD_SAVE_KEY, mergedValue));
        }
        this.lastSyncedValue = mergedValue;
        this.retryAttempts = 0;
        this.setStatus('saved');
        return true;
      } catch (error) {
        if (!this.pendingValue) this.pendingValue = value;
        console.warn('CrazyGames cloud save failed; progress remains in memory', error);
        this.setStatus('error');
        this.scheduleRetry();
        return false;
      } finally {
        this.inFlight = null;
        if (this.pendingValue && this.readComplete && !this.retryTimer) {
          this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            void this.flush();
          }, SAVE_DEBOUNCE_MS);
        }
      }
    });
    return this.inFlight;
  }

  scheduleRetry() {
    if (this.retryTimer || !this.sdk || this.mode !== 'crazygames') return;
    const delay = Math.min(INITIAL_RETRY_MS * (2 ** this.retryAttempts), MAX_RETRY_MS);
    this.retryAttempts += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.readComplete) {
        void this.flush();
      } else {
        void this.connect(this.sdk, this.latestSave);
      }
    }, delay);
  }

  retryPending() {
    if (this.mode !== 'crazygames') return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryAttempts = 0;
    if (this.data && this.readComplete && this.pendingValue) {
      void this.flush();
    } else {
      void this.connect(this.sdk, this.latestSave);
    }
  }

  dispose() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('pagehide', this.onPageHide);
    }
  }

}

export { SaveManager as CrazyGamesCloudSave };
