document.addEventListener("DOMContentLoaded", function () {

  const modal = document.getElementById("orderModal");
  const productNameEl = document.getElementById("modalProductName");
  const sizeSelect = document.getElementById("sizeSelect");

  document.querySelectorAll(".product-card .order-btn").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      const card = this.closest(".product-card");
      const productName = card.querySelector("h3").innerText.trim();
      const pricingText = card.querySelector(".pricing").innerText;

      productNameEl.textContent = "Order — " + productName;

      // Clear previous options
      sizeSelect.innerHTML = "";

      // Split pricing by |
      pricingText.split("|").forEach(item => {
        const option = document.createElement("option");
        option.textContent = item.trim();

        const priceMatch = item.match(/\$(\d+)/);
        option.value = priceMatch ? priceMatch[1] : "0";

        sizeSelect.appendChild(option);
      });

      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");

      document.body.style.overflow = "hidden";
    });
  });

  // Close modal
  document.querySelector(".close-modal").addEventListener("click", function () {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
  });

});
