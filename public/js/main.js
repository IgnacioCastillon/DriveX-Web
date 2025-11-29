// ---------------------
// Paginación AJAX
// ---------------------

const btnContact = document.getElementById("contactButton");
const contactMessage = document.getElementById("contactMessage");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeMessage");

function openContactModal() {
  overlay.classList.add("show");
  contactMessage.classList.add("show");
}

function closeContactModal() {
  overlay.classList.remove("show");
  contactMessage.classList.remove("show");
}

btnContact?.addEventListener("click", openContactModal);
closeBtn?.addEventListener("click", closeContactModal);
overlay?.addEventListener("click", closeContactModal);


document.addEventListener("click", async (e) => {
    const link = e.target.closest(".page-link");
    if (!link) return;
  
    e.preventDefault();
  
    const href = link.getAttribute("href");
    const url = href + (href.includes("?") ? "&" : "?") + "partial=1";
  
    const previousScroll = window.scrollY;
  
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error("Error al cargar página " + res.status);
  
      const data = await res.json();
  
      const grid = document.getElementById("vehicle-grid");
      if (grid) {
        grid.innerHTML = "";
  
        if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          data.vehicles.forEach((v) => {
            const article = document.createElement("article");
            article.className = "vehicle-card";
            article.dataset.vehicleId = v.id;
  
            const images = v.images || [];
            const mainImage = images.find((img) => img.isMain) || images[0];
            const mainSrc = mainImage ? mainImage.imageUrl : "/images/logo.png";
  
            const thumbsHtml = images
              .map(
                (img) =>
                  `<img src="${img.imageUrl}" alt="${v.brand ?? ""} ${v.model ?? ""}">`
              )
              .join("");
  
            article.innerHTML = `
              <a href="/vehicles/${v.id}" class="vehicle-link">
                <div class="vehicle-main-image">
                  <img src="${mainSrc}" alt="${v.brand ?? ""} ${v.model ?? ""}">
                </div>

                <div class="vehicle-info">
                  <h3>${v.brand ?? ""} ${v.model ?? ""}</h3>
                  <p>
                    ${v.price != null ? v.price + " €" : ""}
                    ${v.year ? " · " + v.year : ""}
                    ${
                      v.fuelType || v.fuel_type
                        ? " · " + (v.fuelType || v.fuel_type)
                        : ""
                    }
                  </p>
                </div>
              </a>
            `;
  
            grid.appendChild(article);
          });
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
               href="/?page=${data.currentPage - 1}&search=${encodeURIComponent(
            search
          )}">←</a>
          `;
        } else {
          pagHtml += `<span class="arrow disabled">←</span>`;
        }
  
        pagHtml += `<span class="current-page">${data.currentPage}</span>`;
  
        if (data.currentPage < data.totalPages) {
          pagHtml += `
            <a class="arrow page-link"
               href="/?page=${data.currentPage + 1}&search=${encodeURIComponent(
            search
          )}">→</a>
          `;
        } else {
          pagHtml += `<span class="arrow disabled">→</span>`;
        }
  
        pagination.innerHTML = pagHtml;
      }
  
      const newUrl = `/?page=${data.currentPage}&search=${encodeURIComponent(
        data.search || ""
      )}`;
      window.history.pushState({}, "", newUrl);
  
      window.scrollTo({ top: previousScroll, behavior: "instant" });
    } catch (err) {
      console.error(err);
      alert("Error cambiando de página");
    }
  });
  
  // ---------------------
  // Galería de fotos por vehículo
  // ---------------------
  (function initGallery() {
    const modal = document.getElementById("gallery-modal");
    if (!modal) return;
  
    const imgEl = document.getElementById("gallery-image");
    const counterEl = document.getElementById("gallery-counter");
    const btnPrev = document.getElementById("gallery-prev");
    const btnNext = document.getElementById("gallery-next");
    const btnClose = modal.querySelector(".gallery-close");
    const backdrop = modal.querySelector(".gallery-backdrop");
  
    let currentImages = [];
    let currentIndex = 0;
  
    function showImage(index) {
      if (!currentImages.length) return;
      if (index < 0) index = currentImages.length - 1;
      if (index >= currentImages.length) index = 0;
  
      currentIndex = index;
      imgEl.src = currentImages[currentIndex];
      counterEl.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    }
  
    function openGallery(images) {
      currentImages = images;
      currentIndex = 0;
      showImage(0);
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  
    function closeGallery() {
      modal.style.display = "none";
      document.body.style.overflow = "";
      currentImages = [];
      currentIndex = 0;
    }
  
    btnPrev.addEventListener("click", () => showImage(currentIndex - 1));
    btnNext.addEventListener("click", () => showImage(currentIndex + 1));
    btnClose.addEventListener("click", closeGallery);
    backdrop.addEventListener("click", closeGallery);
  
    document.addEventListener("click", (e) => {
      // AHORA: abrir galería al hacer click en la foto
const opener = e.target.closest(".gallery-opener");
if (!opener) return;

const card = opener.closest(".vehicle-card");
      if (!card) return;
  
      const thumbs = card.querySelectorAll(".vehicle-thumbnails img");
      if (!thumbs.length) return;
  
      const urls = Array.from(thumbs).map((t) => t.src);
      openGallery(urls);
    });
  })();