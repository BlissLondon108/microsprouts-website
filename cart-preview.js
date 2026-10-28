/* MicroSprouts visual basket prototype.
 * Independent of Stripe: this preview cannot place an order or take a payment.
 * Only broccoli packs have published prices; other sprout prices remain by enquiry.
 */
(() => {
  "use strict";
  const items = document.getElementById("basket-items");
  if (!items) return;
  const counter = document.getElementById("basket-count");
  const subtotal = document.getElementById("basket-subtotal");
  const enquiryNote = document.getElementById("basket-unpriced");
  const feedback = document.getElementById("basket-feedback");
  const catalogue = Object.freeze({
    "broccoli-200": {name:"Broccoli · Single Pack", detail:"200g", pennies:999},
    "broccoli-500": {name:"Broccoli · Family Pack", detail:"500g", pennies:1699},
    "radish": {name:"Radish sprouts", detail:"Price by enquiry", pennies:null},
    "mung": {name:"Mung bean sprouts", detail:"Price by enquiry", pennies:null},
    "leek": {name:"Leek sprouts", detail:"Price by enquiry", pennies:null}
  });
  const key = "microsprouts-basket-preview-v1";
  const quantities = Object.create(null);
  const money = pennies => "£" + (pennies / 100).toFixed(2);

  // Persist only non-sensitive SKU and quantity data; reject unknown/invalid
  // or absurd values even when browser storage contains malformed JSON.
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      for (const sku of Object.keys(catalogue)) {
        const n = saved[sku];
        if (Number.isInteger(n) && n > 0 && n <= 10) quantities[sku] = n;
      }
    }
  } catch {
    // Private browsing or disabled storage should not disable this preview.
  }

  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(quantities)); } catch {}
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function render() {
    const skus = Object.keys(catalogue).filter(sku => quantities[sku] > 0);
    const count = skus.reduce((sum, sku) => sum + quantities[sku], 0);
    const pricedSubtotal = skus.reduce((sum, sku) => {
      const p = catalogue[sku].pennies;
      return sum + (p === null ? 0 : p * quantities[sku]);
    }, 0);
    counter.textContent = String(count);
    counter.setAttribute("aria-label",count + (count === 1 ? " item" : " items"));
    subtotal.textContent = money(pricedSubtotal);
    enquiryNote.hidden = !skus.some(sku => catalogue[sku].pennies === null);
    items.replaceChildren();

    if (!skus.length) {
      items.append(element("li","basket-preview__empty",
        "Your basket is waiting for something green. Choose a sprout above to get started."));
      return;
    }

    for (const sku of skus) {
      const product = catalogue[sku];
      const item = element("li", "basket-item");
      const body = element("div", "basket-item__details");
      body.append(element("strong","basket-item__name",product.name));
      body.append(element("span","basket-item__detail",product.detail));
      body.append(element("span","basket-item__price",
        product.pennies === null ? "Price on request" : money(product.pennies * quantities[sku])));
      const controls = element("div","basket-item__controls");
      const minus = element("button","basket-item__adjust","−");
      minus.type="button";
      minus.dataset.basketSku=sku;
      minus.dataset.basketDelta="-1";
      minus.setAttribute("aria-label","Remove one "+product.name);
      const quantity = element("span","basket-item__qty",String(quantities[sku]));
      quantity.setAttribute("aria-label",quantities[sku]+" in basket");
      const plus = element("button","basket-item__adjust","+");
      plus.type="button";
      plus.dataset.basketSku=sku;
      plus.dataset.basketDelta="1";
      plus.disabled=quantities[sku]>=10;
      plus.setAttribute("aria-label","Add one "+product.name);
      controls.append(minus,quantity,plus);
      item.append(body,controls);
      items.append(item);
    }
  }
  function update(sku, delta) {
    if (!Object.hasOwn(catalogue,sku) || !Number.isInteger(delta)) return;
    const old = quantities[sku] || 0;
    const next = Math.max(0, Math.min(10, old + delta));
    if (next === old) {
      if (delta > 0) feedback.textContent = "Maximum 10 packs per variety in this preview.";
      return;
    }
    if (next) quantities[sku] = next;
    else delete quantities[sku];
    save();
    render();
    feedback.textContent = delta > 0 ?
      catalogue[sku].name + " added to your basket preview." :
      catalogue[sku].name + (next ? " quantity updated." : " removed from your basket preview.");
  }
  document.querySelectorAll("[data-cart-sku]").forEach(button => {
    button.addEventListener("click", () => update(button.dataset.cartSku,1));
  });
  items.addEventListener("click", event => {
    const button = event.target.closest("button[data-basket-sku]");
    if (!button || !items.contains(button)) return;
    update(button.dataset.basketSku,Number(button.dataset.basketDelta));
  });
  render();
})();
