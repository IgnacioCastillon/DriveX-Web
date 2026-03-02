(function () {

  const filledStar = `
    <svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 .587l3.668 7.568L24 9.748l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.596 0 9.748l8.332-1.593z"/>
    </svg>
  `;

  const outlineStar = `
    <svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 17.75l-6.172 3.245 1.18-6.875L2.01 9.255l6.902-1.003L12 2l3.088 6.252 6.902 1.003-4.998 4.865 1.18 6.875L12 17.75z"
            fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;

  function getMainImage(v) {
    const images = Array.isArray(v.images) ? v.images : [];
    const main = images.find(img => img && img.isMain) || images[0];
    return main?.imageUrl || "https://darkorchid-chicken-425842.hostingersite.com/images/vehicles/defecto.png";
  }

  function ensureGlobals() {
    if (!Array.isArray(window.__FAV_IDS__)) window.__FAV_IDS__ = [];
  }

  function setFavUI(btn, isFav) {
    btn.classList.toggle("active", isFav);
    btn.innerHTML = isFav ? filledStar : outlineStar;
  }

  function addFavId(id) {
    const sid = String(id);
    if (!window.__FAV_IDS__.includes(sid)) window.__FAV_IDS__.push(sid);
  }

  function removeFavId(id) {
    const sid = String(id);
    window.__FAV_IDS__ = window.__FAV_IDS__.filter(x => x !== sid);
  }

  function initFavIdsFromDom() {
    ensureGlobals();
    document.querySelectorAll(".fav-btn.active").forEach(btn => {
      const id = btn.dataset.vehicleId;
      if (id) addFavId(id);
    });
  }

  async function handleFavClick(btn) {

    if (btn.dataset.loading === "1") return;
    btn.dataset.loading = "1";

    const vehicleId = btn.dataset.vehicleId;
    const wasFav = btn.classList.contains("active");

    setFavUI(btn, !wasFav);
    !wasFav ? addFavId(vehicleId) : removeFavId(vehicleId);

    try {
      const res = await fetch(`/favourites/${vehicleId}/toggle`, {
        method: "POST",
        headers: { "Accept": "application/json" },
        credentials: "same-origin"
      });

      if (res.status === 401 || res.status === 403) {
        document.getElementById("overlay")?.classList.add("show");
        document.getElementById("contactMessage")?.classList.add("show");

        setFavUI(btn, wasFav);
        wasFav ? addFavId(vehicleId) : removeFavId(vehicleId);
        return;
      }

      if (!res.ok) throw new Error("Toggle failed");

      const data = await res.json();
      const nowFav = !!data.favorite;

      setFavUI(btn, nowFav);
      nowFav ? addFavId(vehicleId) : removeFavId(vehicleId);

    } catch (err) {
      setFavUI(btn, wasFav);
      wasFav ? addFavId(vehicleId) : removeFavId(vehicleId);
    } finally {
      btn.dataset.loading = "0";
    }
  }

  async function handleAddVehicleSubmit(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing...";

    try {
      const formData = new FormData(form);

      const res = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });

      if (!res.ok) throw new Error("Error publishing vehicle");

      form.reset();
      const details = form.closest("details");
      if (details) details.open = false;

      alert("Vehicle published successfully");

    } catch (err) {
      alert("Error publishing vehicle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  function initAddVehicleAjax() {
    const form = document.querySelector('form[action="/addVehicle"]');
    if (!form) return;

    form.addEventListener("submit", e => {
      e.preventDefault();
      handleAddVehicleSubmit(form);
    });
  }

  function fillBrandsIfEmpty() {
    const brandSelect = document.getElementById("brand");
    if (!brandSelect) return;
    if (brandSelect.options.length > 1) return;

    const brands = [
      "Abarth","Alfa Romeo","Aprilia","Aston Martin","Audi",
      "Bentley","BMW","Bugatti",
      "Cadillac","Chevrolet","Citroen","Cupra",
      "Dacia","Dodge","Ducati",
      "Ferrari","Fiat","Ford",
      "Honda","Hyundai",
      "Jaguar","Jeep","Kawasaki","Kia","KTM",
      "Lamborghini","Land Rover","Lexus",
      "Maserati","Mazda","McLaren","Mercedes-Benz","Mini","Mitsubishi",
      "Nissan",
      "Opel",
      "Peugeot","Porsche",
      "Renault",
      "Seat","Skoda","Subaru","Suzuki",
      "Tesla","Toyota","Triumph",
      "Volkswagen","Volvo","Yamaha"
    ];

    brands.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      brandSelect.appendChild(opt);
    });
  }

  document.addEventListener("click", e => {
    const btn = e.target.closest(".fav-btn");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleFavClick(btn);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureGlobals();
    initFavIdsFromDom();
    initAddVehicleAjax();
    fillBrandsIfEmpty();
  });

})();