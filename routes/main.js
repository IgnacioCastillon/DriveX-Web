document.addEventListener("DOMContentLoaded", () => {
  initContactPopup();
  initAddVehicleAjax();
  initFavToggle();
});

function initContactPopup() {
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("contactMessage");
  const closeBtn = document.getElementById("closeMessage");

  if (!overlay || !modal || !closeBtn) return;

  const loginBtn = document.querySelector('a[href="/login"].btn-premium.primary');

  if (loginBtn) {
    overlay.classList.add("active");
    modal.classList.add("active");
    overlay.style.display = "block";
    modal.style.display = "block";
  }

  const close = () => {
    overlay.classList.remove("active");
    modal.classList.remove("active");
    overlay.style.display = "none";
    modal.style.display = "none";
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
}

function initAddVehicleAjax() {
  const form = document.querySelector('form[action="/addVehicle"]');
  if (!form) return;

  fillBrandsIfEmpty();

  let msg = form.querySelector(".js-form-msg");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "js-form-msg";
    msg.style.marginTop = "12px";
    msg.style.fontSize = "0.95rem";
    msg.style.color = "var(--text-muted)";
    form.appendChild(msg);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msg.textContent = "";
    msg.style.color = "var(--text-muted)";

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Publishing...";
    }

    try {
      const photosInput = form.querySelector("#photos");
      if (photosInput?.files?.length > 15) {
        throw new Error("Select up to 15 images.");
      }

      const formData = new FormData(form);

      const res = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Error publishing vehicle.");
      }

      msg.style.color = "green";
      msg.textContent = data?.message || "Vehicle published successfully ✅";

      form.reset();

      const details = form.closest("details");
      if (details) details.open = false;

    } catch (err) {
      console.error("ADD VEHICLE ERROR:", err);
      msg.style.color = "crimson";
      msg.textContent = err?.message || "Unexpected error.";
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

function fillBrandsIfEmpty() {
  const brandSelect = document.getElementById("brand");
  if (!brandSelect) return;

  if (brandSelect.options.length > 1) return;

  const brands = [
    "Abarth","Alfa Romeo","Aprilia","Aston Martin","Audi",
    "Bentley","BMW","Brabus","Bugatti",
    "Cadillac","Can-Am","Chevrolet","Chrysler","Citroën","Cupra",
    "Dacia","Daewoo","Daihatsu","Dodge","Ducati",
    "Ferrari","Fiat","Ford",
    "GMC","Honda","Hummer","Hyundai",
    "Infiniti","Isuzu","Jaguar","Jeep","Kawasaki","Kia","KTM",
    "Lamborghini","Lancia","Land Rover","Lexus","Lincoln","Lotus",
    "Maserati","Maybach","Mazda","McLaren","Mercedes-Benz","MG","Mini","Mitsubishi",
    "Nissan",
    "Opel",
    "Peugeot","Piaggio","Polestar","Pontiac","Porsche",
    "Renault","Rolls-Royce",
    "Saab","Seat","Skoda","Smart","Subaru","Suzuki",
    "Tesla","Toyota","Triumph",
    "Volkswagen","Volvo","Yamaha"
  ];

  brands.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSelect.appendChild(opt);
  });
}

function initFavToggle() {
  if (!document.querySelector(".fav-btn")) return;

  const filledStar = `
    <svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .587l3.668 7.568L24 9.748l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.596 0 9.748l8.332-1.593z"/>
    </svg>
  `;

  const outlineStar = `
    <svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 17.75l-6.172 3.245 1.18-6.875L2.01 9.255l6.902-1.003L12 2l3.088 6.252 6.902 1.003-4.998 4.865 1.18 6.875L12 17.75z"
            fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;

  function setFavUI(btn, isFav) {
    if (isFav) {
      btn.classList.add("active");
      btn.innerHTML = filledStar;
      btn.title = "Remove from favourites";
      btn.setAttribute("aria-label", "Remove from favourites");
    } else {
      btn.classList.remove("active");
      btn.innerHTML = outlineStar;
      btn.title = "Add to favourites";
      btn.setAttribute("aria-label", "Add to favourites");
    }
  }

  const isFavPage = window.location.pathname === "/favourites";

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".fav-btn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    if (btn.dataset.loading === "1") return;
    btn.dataset.loading = "1";

    const vehicleId = btn.dataset.vehicleId;
    const wasFav = btn.classList.contains("active");

    setFavUI(btn, !wasFav);

    try {
      const res = await fetch(`/favourites/${vehicleId}/toggle`, { method: "POST" });

      if (res.status === 401 || res.status === 403) {
        setFavUI(btn, wasFav);
        window.location.href = "/login";
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Request failed");

      const nowFav = !!data.favorite;
      setFavUI(btn, nowFav);

      if (isFavPage && nowFav === false) {
        const card = btn.closest(".vehicle-card");
        if (card) card.remove();

        const grid = document.getElementById("vehicle-grid");
        const remaining = grid ? grid.querySelectorAll(".vehicle-card").length : 0;
        if (grid && remaining === 0) {
          grid.innerHTML = `<p class="empty-message">No tienes vehículos en favoritos.</p>`;
        }
      }
    } catch (err) {
      console.error("FAV ERROR:", err);
      setFavUI(btn, wasFav);
      alert("No se pudo actualizar fav (mira consola F12)");
    } finally {
      btn.dataset.loading = "0";
    }
  });
}