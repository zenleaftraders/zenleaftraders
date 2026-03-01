/* assets/js/cart.js
   ZenLeaf shared cart (localStorage key: 'cart')
   - stores array of { name, size, price, quantity }
   - renders badge and cart table
*/

(function(){
  const LS_KEY = 'cart';

  // ---------- helpers ----------
  function parsePrice(val){
    if (typeof val === 'number') return Number(val);
    if (!val) return 0;
    // find first number (handles "$110", "1 oz: $110", "110")
    const m = String(val).replace(/,/g,'').match(/(\d+(\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  // read raw storage
  function readRaw(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  }

  function normalizeRawEntry(r){
  if(!r) return { name: 'Item', size: '', price: 0, quantity: 1 };
  const name = r.name || r.product || r.productName || 'Item';
  let size = r.size || '';
  if(!size && r.sizePrice){
    const parts = String(r.sizePrice).split(':');
    if(parts.length > 1) size = parts[0].trim();
  }

  let price;
  if ('price' in r && r.price !== undefined && r.price !== null && r.price !== '') {
    price = typeof r.price === 'number' ? r.price : parsePrice(r.price);
  } else if (r.sizePrice) {
    price = typeof r.sizePrice === 'number' ? r.sizePrice : parsePrice(r.sizePrice);
  } else {
    price = 0;
  }

  const quantity = Math.max(1, Number(r.quantity) || 1);
  return { name, size, price, quantity };
}


  // aggregate items by name|size|price -> returns canonical array
  function aggregated(){
    const arr = readRaw().map(normalizeRawEntry);
    const map = new Map();
    arr.forEach(it => {
      const key = `${it.name}|||${it.size}|||${it.price}`;
      if(map.has(key)) map.get(key).quantity += it.quantity;
      else map.set(key, { ...it });
    });
    return Array.from(map.values());
  }

  function writeCanonical(items){
    // write canonical array (each item has quantity)
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }

  function formatCurrency(n){
    n = Number(n) || 0;
    return '$' + n.toFixed(2);
  }

  // private: find index for matching item
  function findKeyIndex(items, name, size, price){
    return items.findIndex(i => i.name === name && i.size === size && Number(i.price) === Number(price));
  }

  // ---------- ZLCart API ----------
  const ZLCart = {
    items(){ return aggregated(); },

    add({ name, price = 0, size = '', quantity = 1 }){
      if(!name) return;
      const items = aggregated();
      const idx = findKeyIndex(items, name, size, price);
      if(idx >= 0) items[idx].quantity += Number(quantity) || 1;
      else items.push({ name: String(name), size: String(size), price: Number(price) || 0, quantity: Number(quantity) || 1 });
      // write canonical
      writeCanonical(items);
      ZLCart.renderBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },

    count(){
      return aggregated().reduce((s,i) => s + (Number(i.quantity)||0), 0);
    },

    total(){
      return aggregated().reduce((s,i) => s + (Number(i.price)||0) * (Number(i.quantity)||0), 0);
    },

    clear(){
      localStorage.removeItem(LS_KEY);
      ZLCart.renderBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },

    removeByKeyEncoded(keyEnc){
      // keyEnc is encodeURIComponent(`${name}|||${size}|||${price}`)
      const key = decodeURIComponent(keyEnc);
      const [name, size, price] = key.split('|||');
      const items = aggregated().filter(it => !(it.name===name && it.size===size && Number(it.price)===Number(price)));
      writeCanonical(items);
      ZLCart.renderBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },

    setQtyByKeyEncoded(keyEnc, qty){
      const key = decodeURIComponent(keyEnc);
      const [name, size, price] = key.split('|||');
      const items = aggregated();
      const idx = findKeyIndex(items, name, size, price);
      if(idx === -1) return;
      items[idx].quantity = Math.max(1, Number(qty) || 1);
      writeCanonical(items);
      ZLCart.renderBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },

    // update badges (supports older id/class names)
    renderBadge(){
      const count = ZLCart.count();
      const elNew = document.getElementById('cart-count');
      const elOld = document.getElementById('cartCount');
      if(elNew) elNew.textContent = count;
      if(elOld) elOld.textContent = count;
      document.querySelectorAll('.cart-count, .cart-badge').forEach(e => e.textContent = count);
    },

    // renders the cart table tbody + updates cartTotal + orderDetails
    renderCartTable({ tbodyId = 'cartBody', totalElemId = 'cartTotal', orderDetailsId = 'orderDetails' } = {}){
      const items = aggregated();
      const tbody = document.getElementById(tbodyId);
      if(!tbody) return;
      tbody.innerHTML = '';

      if(items.length === 0){
        tbody.innerHTML = `<tr><td colspan="6">Your cart is empty. Go back to <a href="thcflower.html">THC Flower</a> to add items.</td></tr>`;
        const te = document.getElementById(totalElemId); if(te) te.textContent = formatCurrency(0);
        const od = document.getElementById(orderDetailsId); if(od) od.value = '';
        return;
      }

      let total = 0;
      let summary = '';
      items.forEach(it => {
        const subtotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
        total += subtotal;
        summary += `${it.name} — ${it.size || '-'} — ${formatCurrency(it.price)} x ${it.quantity} => ${formatCurrency(subtotal)}\n`;

        const key = encodeURIComponent(`${it.name}|||${it.size}|||${it.price}`);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(it.name)}</td>
          <td>${escapeHtml(it.size || '-')}</td>
          <td class="num">${formatCurrency(it.price)}</td>
          <td class="num"><input class="qty" type="number" min="1" value="${it.quantity}" data-key="${key}"></td>
          <td class="num">${formatCurrency(subtotal)}</td>
          <td><button class="remove-btn" data-key="${key}" title="Remove">✖</button></td>
        `;
        tbody.appendChild(tr);
      });

      const trTotal = document.createElement('tr');
      trTotal.innerHTML = `<td colspan="4" style="text-align:right;"><strong>Total</strong></td><td class="num"><strong>${formatCurrency(total)}</strong></td><td></td>`;
      tbody.appendChild(trTotal);

      const te = document.getElementById(totalElemId); if(te) te.textContent = formatCurrency(total);
      const od = document.getElementById(orderDetailsId); if(od) od.value = summary + `Total: ${formatCurrency(total)}`;
    }
  };

  // tiny helper
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // expose
  window.ZLCart = ZLCart;

  // DOM bindings
  document.addEventListener('DOMContentLoaded', ()=>{
    ZLCart.renderBadge();

    // If cart table exists on page, render and bind events
    if(document.getElementById('cartBody')){
      ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });

      // delegate remove & qty change
      const tbody = document.getElementById('cartBody');

      tbody.addEventListener('click', (ev)=>{
        const btn = ev.target.closest('.remove-btn');
        if(!btn) return;
        const key = btn.dataset.key;
        ZLCart.removeByKeyEncoded(key);
        ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });
      });

      tbody.addEventListener('change', (ev)=>{
        const input = ev.target.closest('.qty');
        if(!input) return;
        const key = input.dataset.key;
        const qty = input.value;
        ZLCart.setQtyByKeyEncoded(key, qty);
        ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });
      });
    }

    // clear buttons
    document.querySelectorAll('[data-clear-cart]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(!confirm('Clear your cart?')) return;
        ZLCart.clear();
        ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });
      });
    });

    // listen to updates from other pages
    document.addEventListener('cart:updated', ()=>{
      ZLCart.renderBadge();
      ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });
    });

    // sync across tabs
    window.addEventListener('storage', (ev)=>{
      if(ev.key === LS_KEY) {
        ZLCart.renderBadge();
        ZLCart.renderCartTable({ tbodyId: 'cartBody', totalElemId: 'cartTotal', orderDetailsId: 'orderDetails' });
      }
    });
  });

   // ===============================
// UNIVERSAL PRODUCT PAGE HANDLER
// ===============================

document.addEventListener("click", function(e) {

  const btn = e.target.closest(".add-to-cart-btn");
  if (!btn) return;

  const card = btn.closest(".product-card");
  if (!card) return;

  const selected = card.querySelector("input[type='radio']:checked");

  if (!selected) {
    alert("Please select an option.");
    return;
  }

  // expected format: "Product Name - Size|Price"
  const [left, priceRaw] = selected.value.split("|");
  const price = parseFloat(priceRaw) || 0;

  let name = left;
  let size = "";

  if (left.includes(" - ")) {
    const parts = left.split(" - ");
    name = parts[0].trim();
    size = parts[1].trim();
  }

  ZLCart.add({
    name: name,
    size: size,
    price: price,
    quantity: 1
  });

  alert("Added to cart!");
});

})();

