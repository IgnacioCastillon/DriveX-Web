const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

router.patch("/vehicles/:id/offers", async (req, res) => {
    const { id } = req.params;
    const { offers } = req.body;
  
    try {
      await axios.patch(`${BACKEND_URL}/vehicles/${id}/offers`, {
        offers
      });
  
      res.json({ ok: true });
    } catch (error) {
      console.error("Offer update error:", error.message);
      res.status(500).json({ ok: false });
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
        images: [
          { imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad42243261?auto=format&fit=crop&q=80&w=800", isMain: true },
          { imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800", isMain: false }
        ]
      };
  
      return res.render("details", { vehicle: mockVehicle, user: req.session.user || null });
    }
  });


  router.delete("/vehicles/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await axios.delete(`${BACKEND_URL}/vehicles/${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ ok: false });
  }
});



module.exports = router;