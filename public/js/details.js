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