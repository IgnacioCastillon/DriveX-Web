// public/js/add.js

// Usa la BACKEND_URL que te ha inyectado el servidor en la vista
const BACKEND_URL =
  window.BACKEND_URL || "https://drivex-backend-lpl0.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  const brandSelect = document.getElementById("brand");
  if (!brandSelect) return;

  fetch(`${BACKEND_URL}/vehicles/brands`)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Error fetching brands: " + res.status);
      }
      return res.json();
    })
    .then((brands) => {

      brands.forEach((b) => {
        const option = document.createElement("option");
        option.value = b;
        option.textContent = b.replace(/_/g, " ");
        brandSelect.appendChild(option);
      });
    })
    .catch((err) => {
      console.error("Error loading brands", err);
    });
});