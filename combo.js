export function getComboMultiplier(combo) {
  if (combo >= 15) return 10;
  if (combo >= 10) return 5;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function increaseCombo(metrics) {
  const combo = metrics.combo + 1;
  return {
    ...metrics,
    combo,
    maxCombo: Math.max(metrics.maxCombo, combo),
    multiplier: getComboMultiplier(combo)
  };
}

export function breakCombo(metrics) {
  return { ...metrics, combo: 0, multiplier: 1 };
}
