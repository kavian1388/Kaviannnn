/**
 * Ads.js
 * A minimal AdsManager that is disabled by default. It exposes the same
 * call shape a real AdMob (or similar) SDK bridge would use, so wiring in
 * a real provider later is a matter of filling in the marked spots below -
 * no other file in the game needs to change.
 */
(function (RC) {
  'use strict';

  function AdsManager() {
    this.enabled = false; // flip to true once a real ad SDK is wired in
    this.interstitialEveryNLevels = 3;
    this._levelsSincePlayed = 0;
  }

  /** Call whenever a level ends. Decides (internally) whether to show an ad. */
  AdsManager.prototype.notifyLevelComplete = function () {
    this._levelsSincePlayed++;
    if (!this.enabled) return;
    if (this._levelsSincePlayed >= this.interstitialEveryNLevels) {
      this._levelsSincePlayed = 0;
      this.showInterstitial();
    }
  };

  /** Show an interstitial ad. No-op placeholder until enabled + wired. */
  AdsManager.prototype.showInterstitial = function () {
    if (!this.enabled) return Promise.resolve({ shown: false });
    // TODO (future): call into AdMob bridge here, e.g.
    //   window.admob.interstitial.show()
    return Promise.resolve({ shown: true });
  };

  /** Show a rewarded ad, e.g. for bonus coins. Resolves with reward info. */
  AdsManager.prototype.showRewarded = function () {
    if (!this.enabled) return Promise.resolve({ shown: false, reward: 0 });
    // TODO (future): call into AdMob bridge here, e.g.
    //   window.admob.rewarded.show()
    return Promise.resolve({ shown: true, reward: 25 });
  };

  RC.Ads = new AdsManager();

})(window.RC = window.RC || {});
