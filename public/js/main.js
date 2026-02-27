document.addEventListener("click", async (e) => {
  const link = e.target.closest(".page-link");
  if (!link) return;

  e.preventDefault();

  const href = link.getAttribute("href");
  const url = href + (href.includes("?") ? "&" : "?") + "partial=1";

  const previousScroll = window.scrollY;

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

  function renderCard(v) {
    const idStr = String(v.id);
    const hasUser = !!(window.__USER__ && window.__USER__.id);
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

    // ✅ IMPORTANTE: si quieres que la galería funcione, pon la clase gallery-opener en el IMG
    // (tu initGallery busca .gallery-opener)
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

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Error al cargar página " + res.status);

    const data = await res.json();

    // ✅ MUY IMPORTANTE: refrescar favIds cuando cambias página (si el backend los manda)
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
  } catch (err) {
    console.error(err);
    alert("Error cambiando de página");
  }
});