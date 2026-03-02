const express = require("express");
const router = express.Router();
const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

function requireLogin(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }
  if (req.session.user.role !== "Admin") {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  next();
}

router.patch("/vehicles/:id/offers", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { offers } = req.body;

  try {
    await axios.patch(`${BACKEND_URL}/vehicles/${id}/offers`, { offers }, { timeout: 20000 });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Offer update error:", error.message);
    return res.status(500).json({ ok: false });
  }
});

router.put("/vehicles/:id/edit", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};

  const extrasStr = Array.isArray(b.extras) ? b.extras.join(", ") : String(b.extras || "");

  const payload = {
    id: Number(id),
    reference: b.reference || "",
    brand: b.brand || "",
    model: b.model || "",
    hp: Number(b.hp || 0),
    autonomy: Number(b.autonomy || 0),
    averageconsumption: Number(b.averageconsumption || b.average_consumption || 0),
    description: b.description || "",
    price: Number(b.price || 0),
    year: Number(b.year || 0),
    fuelType: b.fuelType || b.fuel_type || "",
    mileage: Number(b.mileage || 0),
    extras: extrasStr,
    doors: Number(b.doors || 0),
    vehicleType: b.vehicleType || b.vehicle_type || "",
    offers: b.offers === "Yes" ? "Yes" : "No",
    images: Array.isArray(b.images) ? b.images : []
  };

  try {
    const upstream = await axios.put(`${BACKEND_URL}/vehicles/${id}`, payload, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 20000
    });

    return res.json({ ok: true, data: upstream.data });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "Update failed",
      upstreamStatus: error.response?.status || 0,
      upstreamData: error.response?.data || null
    });
  }
});

router.get("/vehicles/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(`${BACKEND_URL}/vehicles/${id}`, { timeout: 2500 });
    const vehicle = response.data;

    return res.render("details", { vehicle, user: req.session.user || null });
  } catch (error) {
    console.warn("Backend down, showing mock vehicle for UI preview...");

    const mockVehicle = {
      id: 1,
      brand: "Tesla",
      model: "Model S Plaid",
      price: 89900,
      year: 2024,
      vehicleType: "Sedan",
      fuelType: "Electric",
      mileage: 0,
      hp: 1020,
      description: "El Model S Plaid tiene la aceleración más rápida de cualquier vehículo en producción. Con una propulsión de tres motores de alto rendimiento, entrega más de 1000 CV.",
      extras: "Autopilot, Techo Panorámico, Asientos Calefactables, Sonido Premium",
      offers: "No",
      images: [
        { imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad42243261?auto=format&fit=crop&q=80&w=800", isMain: true },
        { imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800", isMain: false }
      ]
    };

    return res.render("details", { vehicle: mockVehicle, user: req.session.user || null });
  }
});

router.delete("/vehicles/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await axios.delete(`${BACKEND_URL}/vehicles/${id}`, { timeout: 20000 });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error.message);
    return res.status(500).json({ ok: false });
  }
});

module.exports = router;