/* Interior-page navigation only; does not alter homepage checkout behavior. */
(() => {
  "use strict";
  const header = document.querySelector(".interior-head");
  const toggle = document.getElementById("menu-toggle");
  const links = document.getElementById("nav-links");
  if (!header || !toggle || !links) return;

  const closeMenu = () => {
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
})();
