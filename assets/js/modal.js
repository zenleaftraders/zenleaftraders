document.addEventListener('DOMContentLoaded', () => {

  const modal = document.getElementById('orderModal');
  if (!modal) return;

  const productNameEl = document.getElementById('modalProductName');
  const sizeSelect = document.getElementById('sizeSelect');
  const addBtn = document.getElementById('addToCartBtn');
  const goBtn = document.getElementById('goToCartBtn');
  const closeBtn = modal.querySelector('.close-modal');

  // OPEN MODAL
  document.querySelectorAll('.product-card .order-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();

      const card = btn.closest('.product-card');
      if (!card) return;

      const name = card.querySelector('h3')?.innerText.trim() || 'Product';
      const pricingText = card.querySelector('.pricing')?.innerText || '';

      productNameEl.textContent = 'Order — ' + name;
      modal.dataset.productName = name;

      // Build select options from pricing text
      const options = pricingText.split('|').map(part => {
        const pieces = part.split(':');
        const label = pieces[0]?.trim() || '';
        const price = pieces[1]?.trim() || '';
        const numeric = price.replace(/[^0-9.]/g, '');

        return `<option value="${numeric}">${label} - ${price}</option>`;
      }).join('');

      sizeSelect.innerHTML = options;

      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    });
  });

  // CLOSE MODAL FUNCTION
  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  closeBtn?.addEventListener('click', closeModal);

  window.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // ADD TO CART
  addBtn?.addEventListener('click', () => {
    const name = modal.dataset.productName;
    if (!name) return;

    const selected = sizeSelect.options[sizeSelect.selectedIndex];
    const price = Number(selected.value) || 0;
    const size = selected.text.split('-')[0].trim();

    if (window.ZLCart) {
      window.ZLCart.add({
        name: name,
        size: size,
        price: price,
        quantity: 1
      });
    }

    closeModal();
  });

  // ADD & GO TO CART
  goBtn?.addEventListener('click', () => {
    addBtn.click();
    setTimeout(() => {
      window.location.href = 'cart.html';
    }, 200);
  });

});
