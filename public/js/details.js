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