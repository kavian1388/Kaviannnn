// CrazyGames SDK v3 gameplay lifecycle tracker.
//
// - start()/stop() record the state the game WANTS; the SDK is only called when
//   that differs from the state last REPORTED, so duplicate calls are impossible.
// - If the SDK is not initialised yet (or missing, e.g. local play), the wanted
//   state is remembered and delivered by sync() as soon as the SDK is ready.
// - Never throws: all SDK access is guarded.

export function createGameplayTracker({
  getSDK = () => (typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined),
  isReady = () => true,
  warn = (...args) => console.warn(...args)
} = {}) {
  let wanted = false;
  let reported = false;
  let inFlight = false;

  function sync() {
    if (inFlight || wanted === reported) return wanted === reported;
    let game;
    try {
      if (!isReady()) return false;
      game = getSDK()?.game;
    } catch (error) {
      warn('CrazyGames SDK is not accessible', error);
      return false;
    }
    const method = wanted ? game?.gameplayStart : game?.gameplayStop;
    if (typeof method !== 'function') return false;

    const target = wanted;
    try {
      const result = method.call(game);
      reported = target;
      if (result && typeof result.then === 'function') {
        inFlight = true;
        result.then(
          () => { inFlight = false; },
          (error) => {
            inFlight = false;
            reported = !target; // allow a retry on the next sync
            warn(`CrazyGames gameplay ${target ? 'start' : 'stop'} rejected`, error);
          }
        );
      }
      return true;
    } catch (error) {
      warn(`CrazyGames gameplay ${target ? 'start' : 'stop'} failed`, error);
      return false;
    }
  }

  return {
    start() { wanted = true; return sync(); },
    stop() { wanted = false; return sync(); },
    sync,
    isActive: () => reported,
    wantsActive: () => wanted
  };
}
