document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".dx-header");
    if (!header) return;
  
    const burger = header.querySelector(".dx-burger");
    const overlay = header.querySelector(".dx-overlay");
    const drawer = header.querySelector(".dx-drawer");
    const closeBtn = header.querySelector(".dx-close");
  
    const openMenu = () => {
      header.classList.add("menu-open");
      burger?.setAttribute("aria-expanded", "true");
      overlay?.removeAttribute("hidden");
      drawer?.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
  
    const closeMenu = () => {
      header.classList.remove("menu-open");
      burger?.setAttribute("aria-expanded", "false");
      overlay?.setAttribute("hidden", "");
      drawer?.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };
  
    burger?.addEventListener("click", () => {
      header.classList.contains("menu-open") ? closeMenu() : openMenu();
    });
  
    overlay?.addEventListener("click", closeMenu);
    closeBtn?.addEventListener("click", closeMenu);
  
    drawer?.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) closeMenu();
    });
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  });