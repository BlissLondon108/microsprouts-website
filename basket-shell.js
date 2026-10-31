/* Shared MicroSprouts shopping basket on interior pages.
 * This is a copy of the homepage basket markup, kept identical by tests.
 * Must load before cart-preview.js so both use the same existing checkout flow.
 */
(() => {
 "use strict";
 if (document.getElementById("cart-overlay")) return;
 const markup = `
  <div id="cart-overlay" class="cart-overlay" hidden>
    <div class="cart-overlay__backdrop" data-cart-close aria-hidden="true"></div>
    <section class="cart-overlay__panel basket-flow" id="basket" role="dialog" aria-modal="true" aria-labelledby="basket-title" tabindex="-1">
      <div class="cart-overlay__top">
        <div>
          <span class="cart-overlay__brand">MICROSPROUTS</span>
          <h2 id="basket-title" class="serif basket-drawer-title">Your basket</h2>
        </div>
        <button type="button" class="cart-overlay__close" id="close-cart" data-cart-close aria-label="Close shopping basket">Close <span aria-hidden="true">×</span></button>
      </div>
      <form id="basket-flow-form" class="basket-flow__form" novalidate>
        <div class="basket-flow__body">
          <div class="basket-flow__empty" id="basket-empty">
            <p>Your basket is empty.</p>
            <button type="button" id="basket-start" class="basket-flow__start" aria-expanded="false" aria-controls="basket-sprout-picker">Add Sprouts <span aria-hidden="true">+</span></button>
            
          </div>
          <div id="basket-picker-home" class="basket-flow__picker-home">
          <section class="basket-sprout-picker" id="basket-sprout-picker" aria-label="Choose your sprouts" hidden>
              <div class="basket-sprout-picker__heading">
                <span>EXPLORE THE COLLECTION</span>
                <span class="basket-sprout-picker__hint">Drag or swipe</span>
              </div>
              <div id="basket-sprout-track" class="basket-sprout-track" role="list" aria-roledescription="carousel" aria-label="Eight draggable sprout varieties">
                <article role="listitem" class="basket-sprout-card basket-sprout-card--broccoli" data-sprout-card="broccoli" aria-label="Broccoli sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="broccoli" aria-label="Add Broccoli sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/broccoli.webp" width="260" height="136" alt="Broccoli sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Broccoli sprouts</span>
                      <span class="basket-sprout-card__description">Fresh · gently peppery</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--radish" data-sprout-card="radish" aria-label="Radish sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="radish" aria-label="Add Radish sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/radish.webp" width="260" height="136" alt="Radish sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Radish sprouts</span>
                      <span class="basket-sprout-card__description">Bold · peppery</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--mung-bean" data-sprout-card="mung-bean" aria-label="Mung bean sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="mung-bean" aria-label="Add Mung bean sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/mung-bean.webp" width="260" height="136" alt="Mung bean sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Mung bean sprouts</span>
                      <span class="basket-sprout-card__description">Crunchy · mild</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--leek" data-sprout-card="leek" aria-label="Leek sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="leek" aria-label="Add Leek sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/leek.webp" width="260" height="136" alt="Leek sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Leek sprouts</span>
                      <span class="basket-sprout-card__description">Delicate · savoury</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--mustard" data-sprout-card="mustard" aria-label="Mustard sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="mustard" aria-label="Add Mustard sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/mustard.webp" width="260" height="136" alt="Mustard sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Mustard sprouts</span>
                      <span class="basket-sprout-card__description">Bright · spicy</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--fenugreek" data-sprout-card="fenugreek" aria-label="Fenugreek sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="fenugreek" aria-label="Add Fenugreek sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/fenugreek.webp" width="260" height="136" alt="Fenugreek sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Fenugreek sprouts</span>
                      <span class="basket-sprout-card__description">Earthy · aromatic</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--alfalfa" data-sprout-card="alfalfa" aria-label="Alfalfa sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="alfalfa" aria-label="Add Alfalfa sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/alfalfa.webp" width="260" height="136" alt="Alfalfa sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Alfalfa sprouts</span>
                      <span class="basket-sprout-card__description">Tender · mild</span>
                    </span>
                  </button>
                </article>
                <article role="listitem" class="basket-sprout-card basket-sprout-card--green-pea" data-sprout-card="green-pea" aria-label="Green pea sprouts">
                  <button type="button" class="basket-sprout-card__hit" data-sprout-add="green-pea" aria-label="Add Green pea sprouts to basket">
                    <span class="basket-sprout-card__visual"><img src="assets/sprout-orbs/green-pea.webp" width="260" height="136" alt="Green pea sprouts" loading="lazy" draggable="false" decoding="async"></span>
                    <span class="basket-sprout-card__content">
                      <span class="basket-sprout-card__name">Green pea sprouts</span>
                      <span class="basket-sprout-card__description">Fresh · gently sweet</span>
                    </span>
                  </button>
                </article>
              </div>
            </section>
          </div>
          <div class="basket-flow__previous" id="basket-other-items" aria-label="Your sprout packs in order of addition">
          <section class="basket-flow__current" id="basket-current-item" aria-label="Sprout pack being configured">
          <button type="button" class="basket-flow__mini-remove basket-flow__current-remove" id="basket-remove-entry" aria-label="Remove this sprout pack" hidden>×</button>
          <div class="basket-flow__selections" id="basket-selections" aria-label="Current pack selections">
            <button type="button" data-edit-step="pack" id="basket-selected-pack" hidden></button>
            <button type="button" data-edit-step="order" id="basket-selected-order" hidden></button>
            <button type="button" data-edit-step="delivery" id="basket-selected-delivery" hidden></button>
          </div>
          <div class="basket-flow__product">
            <img id="basket-current-photo" src="assets/sprout-orbs/broccoli.webp" width="110" height="110" alt="Fresh broccoli sprouts">
            <div class="basket-flow__product-name">
              <strong id="basket-current-name">Broccoli Sprouts</strong>
              <p>Freshly grown in London</p>
            </div>
            <div class="basket-flow__current-cost">
              <strong class="basket-flow__current-price" id="basket-current-price" hidden></strong>
              <small class="basket-flow__shipping-note" id="basket-current-shipping" hidden></small>
            </div>
          </div>
          <div class="basket-flow__stage" id="basket-stage" aria-live="polite">
            <section data-basket-stage="pack" aria-labelledby="basket-pack-label">
              <h3 id="basket-pack-label">Choose your pack</h3>
              <div class="basket-flow__choices">
                <button type="button" class="basket-flow__choice" data-flow-pack="200">
                  <strong>200g</strong><span>Single Pack</span>
                  <small id="basket-pack-200-price">£9.99</small>
                </button>
                <button type="button" class="basket-flow__choice" data-flow-pack="500">
                  <strong>500g</strong><span>Family Pack</span>
                  <small id="basket-pack-500-price">£16.99</small>
                </button>
              </div>
            </section>
            <section data-basket-stage="order" aria-labelledby="basket-order-label" hidden>
              <h3 id="basket-order-label">How often?</h3>
              <div class="basket-flow__choices">
                <button type="button" class="basket-flow__choice" data-flow-order="once"><strong>One-time</strong><span>Order once</span></button>
                <button type="button" class="basket-flow__choice" data-flow-order="weekly"><strong>Weekly</strong><span>Subscribe &amp; save</span></button>
              </div>
            </section>
            <section data-basket-stage="delivery" aria-labelledby="basket-delivery-label" hidden>
              <h3 id="basket-delivery-label">How should we get it to you?</h3>
              <div class="basket-flow__choices">
                <button type="button" class="basket-flow__choice" data-flow-method="pickup"><strong>Collection</strong><span>Free</span></button>
                <button type="button" class="basket-flow__choice" data-flow-method="delivery"><strong>Shipping</strong><span id="basket-delivery-price">UK · £2.30</span></button>
              </div>
            </section>

          </div>
          </section>
          </div>
          <div class="basket-flow__items" id="basket-items-control" hidden>
            <button type="button" id="basket-add-another">+ Another broccoli pack</button>
            <button type="button" id="basket-add-variety">+ Choose another variety</button>
          </div>
        </div>
          <div class="basket-flow__shared" id="basket-shared-details">
            <section data-basket-stage="details" aria-label="Order details" hidden>
              <div class="basket-flow__calendar" aria-label="Preferred date">
                <div class="basket-flow__month-heading">
                  <span id="basket-calendar-month" class="basket-flow__month-name"></span>
                </div>
                <div class="basket-flow__calendar-strip">
                  <button type="button" class="basket-flow__calendar-arrow" id="basket-calendar-prev" aria-label="Previous available dates">‹</button>
                  <div class="basket-flow__calendar-grid" id="basket-calendar-grid" role="group" aria-label="Choose an available date Tuesday to Friday"></div>
                  <button type="button" class="basket-flow__calendar-arrow" id="basket-calendar-next" aria-label="Next available dates">›</button>
                </div>
                <input id="basket-date" type="hidden" required>
                <p class="basket-flow__visually-hidden" id="basket-date-label" aria-live="polite">Choose a Tuesday–Friday date</p>
              </div>
            </section>
          </div>
        <div id="basket-picker-dock" class="basket-flow__carousel-dock" hidden></div>
        <div class="basket-flow__footer">
          <div class="basket-flow__total">
            <div><span id="basket-total-type">Your sprouts</span><small id="basket-total-note">Choose a pack to begin</small></div>
            <strong id="basket-total">—</strong>
          </div>
          <p class="basket-flow__error" id="basket-error" role="status" aria-live="polite" hidden></p>
          <button type="submit" class="basket-flow__pay" id="basket-pay" hidden disabled>Continue to payment <span aria-hidden="true">→</span></button>
        </div>
      </form>
    </section>
  </div>
`;
 document.body.insertAdjacentHTML("beforeend",markup);
})();
