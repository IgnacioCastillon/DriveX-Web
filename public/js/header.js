document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".dx-header");
    if (!header) return;
  
    const burger = header.querySelector(".dx-burger");
    const overlay = header.querySelector(".dx-overlay");
    const navLinks = header.querySelectorAll(".dx-nav a");
  
    function openMenu(){
      header.classList.add("menu-open");
      burger?.setAttribute("aria-expanded", "true");
      overlay?.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
    }
  
    function closeMenu(){
      header.classList.remove("menu-open");
      burger?.setAttribute("aria-expanded", "false");
      overlay?.setAttribute("hidden", "");
      document.body.style.overflow = "";
    }
  
    burger?.addEventListener("click", () => {
      if (header.classList.contains("menu-open")) closeMenu();
      else openMenu();
    });
  
    overlay?.addEventListener("click", closeMenu);
  
    navLinks.forEach(a => a.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) closeMenu();
    }));
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  });