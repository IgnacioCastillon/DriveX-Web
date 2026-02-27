(function () {
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

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getMainImage(v) {
    const images = Array.isArray(v.images) ? v.images : [];
    const main = images.find((img) => img && img.isMain) || images[0];
    return main?.imageUrl || "https://darkorchid-chicken-425842.hostingersite.com/images/vehicles/defecto.png";
  }

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

  function addFavId(id) {
    const sid = String(id);
    if (!window.__FAV_IDS__.includes(sid)) window.__FAV_IDS__.push(sid);
  }

  function removeFavId(id) {
    const sid = String(id);
    window.__FAV_IDS__ = window.__FAV_IDS__.filter((x) => x !== sid);
  }

  function isLoggedInByDom() {
    return !!document.querySelector(".user-profile");
  }

  function ensureGlobals() {
    if (!Array.isArray(window.__FAV_IDS__)) window.__FAV_IDS__ = [];
    if (typeof window.__IS_FAV_PAGE__ !== "boolean") {
      window.__IS_FAV_PAGE__ = window.location.pathname === "/favourites" || window.location.pathname === "/favourites/";
    }
    if (isLoggedInByDom()) {
      if (!window.__USER__) window.__USER__ = { id: true };
    } else {
      window.__USER__ = null;
    }
  }

  function initFavIdsFromDom() {
    ensureGlobals();
    document.querySelectorAll(".fav-btn.active").forEach((btn) => {
      const id = btn.dataset.vehicleId;
      if (id) addFavId(id);
    });
  }

  function renderCard(v) {
    const idStr = String(v.id);
    const hasUser = isLoggedInByDom();
    const favIds = Array.isArray(window.__FAV_IDS__) ? window.__FAV_IDS__.map(String) : [];
    const isFav = favIds.includes(idStr);

    const favBtnHtml = hasUser
      ? `
        <button
          class="fav-btn ${isFav ? "active" : ""}"
          type="button"
          data-vehicle-id="${escapeHtml(v.id)}"
          aria-label="${isFav ? "Remove from favourites" : "Add to favourites"}"
          title="${isFav ? "Remove from favourites" : "Add to favourites"}"
        >
          ${isFav ? filledStar : outlineStar}
        </button>
      `
      : "";

    const mainSrc = getMainImage(v);

    return `
      <article class="vehicle-card" data-vehicle-id="${escapeHtml(v.id)}">
        ${favBtnHtml}

        <a href="/vehicles/${escapeHtml(v.id)}" class="vehicle-link">
          <div class="vehicle-main-image">
            <img class="gallery-opener" src="${escapeHtml(mainSrc)}" alt="${escapeHtml(v.brand ?? "")} ${escapeHtml(v.model ?? "")}">
          </div>

          <div class="vehicle-info">
            <h3>${escapeHtml(v.brand ?? "")} ${escapeHtml(v.model ?? "")}</h3>
            <p>${escapeHtml(v.vehicleType ?? "")}</p>
            <br>
            <p>
              ${v.price != null ? escapeHtml(v.price) + " €" : ""}
              ${v.mileage != null ? " · " + escapeHtml(v.mileage) + " miles" : ""}
              ${v.year ? " · " + escapeHtml(v.year) : ""}
              ${v.fuelType || v.fuel_type ? " · " + escapeHtml(v.fuelType || v.fuel_type) : ""}
            </p>
          </div>
        </a>
      </article>
    `;
  }

  async function handlePaginationClick(link) {
    const href = link.getAttribute("href");
    if (!href) return;

    const url = href + (href.includes("?") ? "&" : "?") + "partial=1";
    const previousScroll = window.scrollY;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Error al cargar página " + res.status);

    const data = await res.json();

    if (Array.isArray(data.favoriteIds)) {
      window.__FAV_IDS__ = data.favoriteIds.map(String);
    } else if (!Array.isArray(window.__FAV_IDS__)) {
      window.__FAV_IDS__ = [];
    }

    const grid = document.getElementById("vehicle-grid");
    if (grid) {
      if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
        grid.innerHTML = data.vehicles.map(renderCard).join("");
      } else {
        grid.innerHTML = '<p class="empty-message">No hay vehículos disponibles.</p>';
      }
    }

    const pagination = document.querySelector(".pagination");
    if (pagination) {
      let pagHtml = "";
      const search = data.search || "";

      if (data.currentPage > 1) {
        pagHtml += `
          <a class="arrow page-link"
             href="/?page=${data.currentPage - 1}&search=${encodeURIComponent(search)}">←</a>
        `;
      } else {
        pagHtml += `<span class="arrow disabled">←</span>`;
      }

      pagHtml += `<span class="current-page">${data.currentPage}</span>`;

      if (data.currentPage < data.totalPages) {
        pagHtml += `
          <a class="arrow page-link"
             href="/?page=${data.currentPage + 1}&search=${encodeURIComponent(search)}">→</a>
        `;
      } else {
        pagHtml += `<span class="arrow disabled">→</span>`;
      }

      pagination.innerHTML = pagHtml;
    }

    const newUrl = `/?page=${data.currentPage}&search=${encodeURIComponent(data.search || "")}`;
    window.history.pushState({}, "", newUrl);

    window.scrollTo({ top: previousScroll, behavior: "instant" });

    initFavIdsFromDom();
  }

  async function handleFavClick(btn) {
    ensureGlobals();

    if (!window.__USER__) {
      window.location.href = "/login";
      return;
    }

    if (btn.dataset.loading === "1") return;
    btn.dataset.loading = "1";

    const vehicleId = btn.dataset.vehicleId;
    const wasFav = btn.classList.contains("active");

    setFavUI(btn, !wasFav);
    if (!wasFav) addFavId(vehicleId);
    else removeFavId(vehicleId);

    try {
      const res = await fetch(`/favourites/${vehicleId}/toggle`, { method: "POST" });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Request failed");

      const data = JSON.parse(text);
      const nowFav = !!data.favorite;

      setFavUI(btn, nowFav);
      if (nowFav) addFavId(vehicleId);
      else removeFavId(vehicleId);

      if (window.__IS_FAV_PAGE__ && nowFav === false) {
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
      if (wasFav) addFavId(vehicleId);
      else removeFavId(vehicleId);

      alert("No se pudo actualizar fav (mira consola F12)");
    } finally {
      btn.dataset.loading = "0";
    }
  }

  async function handleAddVehicleSubmit(form) {
    const msgClass = "js-form-msg";
    let msg = form.querySelector("." + msgClass);
    if (!msg) {
      msg = document.createElement("div");
      msg.className = msgClass;
      msg.style.marginTop = "12px";
      msg.style.fontSize = "0.95rem";
      msg.style.color = "var(--text-muted)";
      form.appendChild(msg);
    }

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

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}

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
  }

  function initAddVehicleAjax() {
    const form = document.querySelector('form[action="/addVehicle"]');
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleAddVehicleSubmit(form);
    });
  }

  document.addEventListener("click", async (e) => {
    ensureGlobals();

    const link = e.target.closest(".page-link");
    if (link) {
      e.preventDefault();
      try {
        await handlePaginationClick(link);
      } catch (err) {
        console.error(err);
        alert("Error cambiando de página");
      }
      return;
    }

    const btn = e.target.closest(".fav-btn");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      await handleFavClick(btn);
      return;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureGlobals();
    initFavIdsFromDom();
    initAddVehicleAjax();
  });
})();