import { SKINS } from './save.js';

export function renderShop(save, onBuy, onEquip) {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  grid.innerHTML = '';

  SKINS.forEach((skin) => {
    const card = document.createElement('div');
    card.className = 'skin-card';
    card.innerHTML = `
      <div class="skin-preview" style="background: linear-gradient(135deg, ${skin.color}, ${skin.accent});"></div>
      <div class="skin-meta">
        <h3>${skin.name}</h3>
        <div class="skin-cost"><span class="coin-icon">◉</span>${skin.price}</div>
      </div>
      <div class="skin-actions">
        <button class="skin-button buy-button">${save.purchasedSkins.includes(skin.id) ? 'OWNED' : 'BUY'}</button>
        <button class="skin-button equip-button" ${!save.purchasedSkins.includes(skin.id) ? 'disabled' : ''}>${save.selectedSkin === skin.id ? 'EQUIPPED' : 'EQUIP'}</button>
      </div>
    `;

    const buyButton = card.querySelector('.buy-button');
    const equipButton = card.querySelector('.equip-button');

    if (!save.purchasedSkins.includes(skin.id)) {
      buyButton.addEventListener('click', () => onBuy(skin.id));
    } else {
      buyButton.disabled = true;
      buyButton.textContent = 'OWNED';
    }

    if (save.purchasedSkins.includes(skin.id)) {
      equipButton.addEventListener('click', () => onEquip(skin.id));
    }

    grid.appendChild(card);
  });
}
