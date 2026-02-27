document.addEventListener("DOMContentLoaded", function () {
  try { initContactPopup(); } catch (e) { console.error("initContactPopup", e); }
  try { initAddVehicleAjax(); } catch (e) { console.error("initAddVehicleAjax", e); }
  try { initFavToggle(); } catch (e) { console.error("initFavToggle", e); }
});

function initContactPopup() {
  var overlay = document.getElementById("overlay");
  var modal = document.getElementById("contactMessage");
  var closeBtn = document.getElementById("closeMessage");
  if (!overlay || !modal || !closeBtn) return;

  var loginBtn = document.querySelector('a[href="/login"].btn-premium.primary');
  if (loginBtn) {
    overlay.style.display = "block";
    modal.style.display = "block";
  }

  function close() {
    overlay.style.display = "none";
    modal.style.display = "none";
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
}

function initAddVehicleAjax() {
  var form = document.querySelector('form[action="/addVehicle"]');
  if (!form) return;

  fillBrandsIfEmpty();

  var msg = form.querySelector(".js-form-msg");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "js-form-msg";
    msg.style.marginTop = "12px";
    msg.style.fontSize = "0.95rem";
    msg.style.color = "var(--text-muted)";
    form.appendChild(msg);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    msg.textContent = "";
    msg.style.color = "var(--text-muted)";

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Publishing...";
    }

    var photosInput = document.getElementById("photos");
    if (photosInput && photosInput.files && photosInput.files.length > 15) {
      msg.style.color = "crimson";
      msg.textContent = "Select up to 15 images.";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }

    var formData = new FormData(form);

    fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        }).catch(function () {
          return { res: res, data: null };
        });
      })
      .then(function (pack) {
        if (!pack.res.ok) {
          throw new Error((pack.data && pack.data.message) ? pack.data.message : "Error publishing vehicle.");
        }

        msg.style.color = "green";
        msg.textContent = (pack.data && pack.data.message) ? pack.data.message : "Vehicle published successfully ✅";

        form.reset();

        var details = form.closest("details");
        if (details) details.open = false;
      })
      .catch(function (err) {
        console.error("ADD VEHICLE ERROR:", err);
        msg.style.color = "crimson";
        msg.textContent = err && err.message ? err.message : "Unexpected error.";
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
  });
}

function fillBrandsIfEmpty() {
  var brandSelect = document.getElementById("brand");
  if (!brandSelect) return;
  if (brandSelect.options && brandSelect.options.length > 1) return;

  var brands = [
    "Abarth","Alfa Romeo","Aprilia","Aston Martin","Audi",
    "Bentley","BMW","Brabus","Bugatti",
    "Cadillac","Can-Am","Chevrolet","Chrysler","Citroen","Cupra",
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

  for (var i = 0; i < brands.length; i++) {
    var opt = document.createElement("option");
    opt.value = brands[i];
    opt.textContent = brands[i];
    brandSelect.appendChild(opt);
  }
}

function initFavToggle() {
  if (!document.querySelector(".fav-btn")) return;

  var filledStar =
    '<svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 .587l3.668 7.568L24 9.748l-6 5.848L19.335 24 12 19.897 4.665 24 6 15.596 0 9.748l8.332-1.593z"/>' +
    '</svg>';

  var outlineStar =
    '<svg class="fav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 17.75l-6.172 3.245 1.18-6.875L2.01 9.255l6.902-1.003L12 2l3.088 6.252 6.902 1.003-4.998 4.865 1.18 6.875L12 17.75z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '</svg>';

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

  var isFavPage = (window.location.pathname === "/favourites" || window.location.pathname === "/favourites/");

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".fav-btn") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    if (btn.dataset.loading === "1") return;
    btn.dataset.loading = "1";

    var vehicleId = btn.dataset.vehicleId;
    var wasFav = btn.classList.contains("active");

    setFavUI(btn, !wasFav);

    fetch("/favourites/" + vehicleId + "/toggle", { method: "POST" })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          setFavUI(btn, wasFav);
          window.location.href = "/login";
          return null;
        }
        return res.json().then(function (data) {
          return { res: res, data: data };
        }).catch(function () {
          return { res: res, data: null };
        });
      })
      .then(function (pack) {
        if (!pack) return;

        if (!pack.res.ok) {
          throw new Error((pack.data && pack.data.message) ? pack.data.message : "Request failed");
        }

        var nowFav = !!(pack.data && pack.data.favorite);
        setFavUI(btn, nowFav);

        if (isFavPage && nowFav === false) {
          var card = btn.closest(".vehicle-card");
          if (card) card.remove();

          var grid = document.getElementById("vehicle-grid");
          var remaining = grid ? grid.querySelectorAll(".vehicle-card").length : 0;
          if (grid && remaining === 0) {
            grid.innerHTML = '<p class="empty-message">No tienes vehículos en favoritos.</p>';
          }
        }
      })
      .catch(function (err) {
        console.error("FAV ERROR:", err);
        setFavUI(btn, wasFav);
        alert("No se pudo actualizar fav (mira consola F12)");
      })
      .finally(function () {
        btn.dataset.loading = "0";
      });
  });
}