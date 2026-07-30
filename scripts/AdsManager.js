/**
 * AdsManager.js
 * Placeholder ad integration layer. Disabled by default so the shipped
 * build has zero ad calls; flip ENABLED and wire showInterstitial /
 * showRewarded to the Google AdMob Web/Cordova/Capacitor SDK when the
 * publishing pipeline is ready for monetization.
 */
const AdsManager = (() => {
  const ENABLED = false;

  function init() {
    if (!ENABLED) return;
    // Integration point: initialize AdMob SDK here.
  }

  function showInterstitial(onClose) {
    if (!ENABLED) { if (onClose) onClose(); return; }
    // Integration point: request + show interstitial, then onClose().
    if (onClose) onClose();
  }

  function showRewarded(onReward, onClose) {
    if (!ENABLED) { if (onClose) onClose(); return; }
    // Integration point: request + show rewarded ad.
    // Call onReward() only if the user completed the ad.
    if (onClose) onClose();
  }

  return { init, showInterstitial, showRewarded, ENABLED };
})();
