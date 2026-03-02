document.addEventListener("change", async (e) => {
  const toggle = e.target.closest(".offer-toggle");
  if (!toggle) return;

  const vehicleId = toggle.dataset.vehicleId;
  const enabled = toggle.checked;

  try {
    const res = await fetch(`/vehicles/${vehicleId}/offers`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        offers: enabled ? "Yes" : "No"
      })
    });

    if (!res.ok) throw new Error("Update failed");

  } catch (err) {
    console.error(err);
    toggle.checked = !enabled;
    alert("Error updating offer");
  }
});

document.addEventListener("DOMContentLoaded", () => {

  const deleteBtn = document.getElementById("deleteButton");
  const modal = document.getElementById("deleteModal");
  const cancelBtn = document.getElementById("cancelDelete");
  const confirmBtn = document.getElementById("confirmDelete");
  const input = document.getElementById("confirmInput");

  if (!deleteBtn) return;

  const vehicleId = deleteBtn.dataset.vehicleId;

  deleteBtn.addEventListener("click", () => {
    modal.classList.add("active");
    input.value = "";
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  confirmBtn.addEventListener("click", async () => {

    if (input.value !== "YES") {
      alert("You must type YES to confirm.");
      return;
    }

    try {
      const res = await fetch(`/vehicles/${vehicleId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Delete failed");

      window.location.href = "/";

    } catch (err) {
      console.error(err);
      alert("Error deleting vehicle.");
    }
  });



});

(function () {
  const editBtn = document.getElementById("editButton");
  const modal = document.getElementById("editModal");
  const form = document.getElementById("editVehicleForm");
  const statusEl = document.getElementById("editStatus");
  const saveBtn = document.getElementById("saveEditBtn");
  if (!editBtn || !modal || !form) return;

  const vehicle = (() => {
    try { return JSON.parse(document.getElementById("vehiclePayload")?.textContent || "{}"); }
    catch { return {}; }
  })();

  const brands = ["Abarth","Alfa Romeo","Aprilia","Aston Martin","Audi","Bentley","BMW","Bugatti","Cadillac","Chevrolet","Citroen","Cupra","Dacia","Dodge","Ducati","Ferrari","Fiat","Ford","Honda","Hyundai","Jaguar","Jeep","Kawasaki","Kia","KTM","Lamborghini","Land Rover","Lexus","Maserati","Mazda","McLaren","Mercedes-Benz","Mini","Mitsubishi","Nissan","Opel","Peugeot","Porsche","Renault","Seat","Skoda","Subaru","Suzuki","Tesla","Toyota","Triumph","Volkswagen","Volvo","Yamaha"];

  const extrasList = ["ABS","Airbags","Automatic Climate Control","Bluetooth","Cruise Control","Navigation System","Parking Sensors","Rear Camera","360 Camera","Sunroof","Panoramic Roof","Leather Seats","Heated Seats","Ventilated Seats","Sport Seats","Electric Seats","Keyless Entry","Keyless Start","LED Headlights","Xenon Headlights","Fog Lights","Alloy Wheels","Sport Exhaust","Adaptive Cruise Control","Lane Assist","Blind Spot Assist","Traffic Sign Recognition","Automatic Emergency Braking","Android Auto","Apple CarPlay","Premium Sound System","Wireless Charger","Tow Hitch","Roof Rack","Tinted Windows","Air Suspension","Sport Suspension"];

  function openModal(){ modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
  function closeModal(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; if(statusEl) statusEl.textContent=""; }

  function fillBrandSelect(){
    const sel = document.getElementById("editBrand");
    if (!sel) return;
    sel.innerHTML = `<option value="" disabled>Select brand</option>`;
    brands.forEach(b => { const o=document.createElement("option"); o.value=b; o.textContent=b; sel.appendChild(o); });
  }

  function fillExtrasSelect(){
    const sel = document.getElementById("editExtras");
    if (!sel) return;
    sel.innerHTML = "";
    extrasList.forEach(x => { const o=document.createElement("option"); o.value=x; o.textContent=x; sel.appendChild(o); });
  }

  function setSelectValue(select, value){
    if (!select) return;
    const v = String(value ?? "");
    const opt = Array.from(select.options).find(o => o.value === v);
    if (opt) select.value = v;
  }

  function prefill(){
    fillBrandSelect();
    fillExtrasSelect();

    form.elements.brand.value = vehicle.brand || "";
    form.elements.model.value = vehicle.model || "";
    setSelectValue(form.elements.vehicleType, vehicle.vehicleType);
    setSelectValue(form.elements.fuelType, vehicle.fuelType || vehicle.fuel_type);
    form.elements.year.value = vehicle.year ?? "";
    form.elements.price.value = vehicle.price ?? "";
    form.elements.mileage.value = vehicle.mileage ?? "";
    form.elements.hp.value = vehicle.hp ?? "";
    form.elements.doors.value = vehicle.doors ?? "";
    form.elements.reference.value = vehicle.reference ?? "";
    form.elements.description.value = vehicle.description ?? "";
    setSelectValue(form.elements.offers, vehicle.offers === "Yes" ? "Yes" : "No");

    const currentExtras = String(vehicle.extras || "").split(",").map(s => s.trim()).filter(Boolean);
    const extrasSel = document.getElementById("editExtras");
    if (extrasSel) Array.from(extrasSel.options).forEach(o => o.selected = currentExtras.includes(o.value));
  }

  editBtn.addEventListener("click", () => { prefill(); openModal(); });
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close='1']")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.elements.id.value;

    const extrasSel = document.getElementById("editExtras");
    const extras = extrasSel ? Array.from(extrasSel.selectedOptions).map(o => o.value) : [];

    const payload = {
      id: Number(id),
      brand: form.elements.brand.value.trim(),
      model: form.elements.model.value.trim(),
      vehicleType: form.elements.vehicleType.value,
      fuelType: form.elements.fuelType.value,
      year: Number(form.elements.year.value),
      price: Number(form.elements.price.value),
      mileage: Number(form.elements.mileage.value),
      hp: form.elements.hp.value ? Number(form.elements.hp.value) : 0,
      doors: form.elements.doors.value ? Number(form.elements.doors.value) : 0,
      reference: form.elements.reference.value.trim(),
      description: form.elements.description.value.trim(),
      extras: extras.join(", "),
      offers: form.elements.offers.value === "Yes" ? "Yes" : "No"
    };

    saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Saving...";

    try {
      const res = await fetch(`/vehicles/${id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 401 || res.status === 403) { window.location.href="/login"; return; }
      if (!res.ok) throw new Error(await res.text().catch(() => "Save failed"));

      if (statusEl) statusEl.textContent = "Saved. Refreshing...";
      window.location.reload();
    } catch (err) {
      if (statusEl) statusEl.textContent = "Error saving changes.";
      saveBtn.disabled = false;
    }
  });
})();