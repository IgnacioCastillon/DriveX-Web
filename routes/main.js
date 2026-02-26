const express = require("express");
const router = express.Router();
const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

router.get("/", async (req, res) => {
  const search = req.query.search || "";
  const vehicleType = req.query.vehicleType || "";
  const page = parseInt(req.query.page || "1", 10);
  const perPage = 14;
  const partial = req.query.partial === "1";

  try {
    let apiUrl = `${BACKEND_URL}/vehicles`;

    if (vehicleType.trim() !== "") {
      apiUrl = `${BACKEND_URL}/vehicles/vehicleType?q=${encodeURIComponent(vehicleType)}`;
    }

    if (search.trim() !== "") {
      apiUrl = `${BACKEND_URL}/vehicles/search?q=${encodeURIComponent(search)}`;
    }

    const response = await axios.get(apiUrl, { timeout: 2500 });

    let allVehicles;
    if (Array.isArray(response.data)) {
      allVehicles = response.data;
    } else if (Array.isArray(response.data.content)) {
      allVehicles = response.data.content;
    } else {
      console.log("Respuesta rara de /api/vehicles:", response.data);
      allVehicles = [];
    }

    // ✅ Cargar favoritos del usuario (para pintar estrella)
    let favoriteIds = [];
    if (req.session.user && req.session.user.id) {
      try {
        const userId = req.session.user.id;
        const favRes = await axios.get(`${BACKEND_URL}/users/${userId}/favorites`, { timeout: 2500 });

        if (Array.isArray(favRes.data)) {
          favoriteIds = favRes.data.map(v => v.id);
        } else {
          favoriteIds = [];
        }
      } catch (e) {
        console.log("No se pudieron cargar favoritos:", e.message);
        favoriteIds = [];
      }
    }

    const totalVehicles = allVehicles.length;
    const totalPages = Math.max(1, Math.ceil(totalVehicles / perPage));
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const vehicles = allVehicles.slice(start, end);

    if (partial) {
      return res.json({
        vehicles,
        search,
        currentPage,
        totalPages,
        totalVehicles,
        favoriteIds,
      });
    }

    res.render("main", {
      vehicles,
      search,
      currentPage,
      totalPages,
      totalVehicles,
      user: req.session.user || null,
      favoriteIds,
    });
  } catch (error) {
    console.warn("Backend down, showing mock data for UI preview...");

    const mockVehicles = [
      {
        id: 1,
        brand: "Tesla",
        model: "Model S Plaid",
        price: 89900,
        year: 2024,
        vehicleType: "Sedan",
        fuelType: "Electric",
        mileage: 0,
        images: [{ imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad42243261?auto=format&fit=crop&q=80&w=800", isMain: true }]
      },
      {
        id: 2,
        brand: "Porsche",
        model: "911 Carrera",
        price: 120500,
        year: 2023,
        vehicleType: "Sport Car",
        fuelType: "Gasoline",
        mileage: 1200,
        images: [{ imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800", isMain: true }]
      },
      {
        id: 3,
        brand: "BMW",
        model: "S1000RR",
        price: 22000,
        year: 2024,
        vehicleType: "Sport Bike",
        fuelType: "Gasoline",
        mileage: 0,
        images: [{ imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800", isMain: true }]
      }
    ];

    res.render("main", {
      vehicles: mockVehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: 3,
      user: req.session.user || null,
      favoriteIds: [],
    });
  }
});

router.get("/vehicles/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(`${BACKEND_URL}/vehicles/${id}`, { timeout: 2500 });
    const vehicle = response.data;

    res.render("details", { vehicle, user: req.session.user || null });
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
    res.render("details", { vehicle: mockVehicle, user: req.session.user || null });
  }
});

function requireLogin(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }
  next();
}

router.post("/favorites/:vehicleId/toggle", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const vehicleId = req.params.vehicleId;

  try {
    const favRes = await axios.get(`${BACKEND_URL}/users/${userId}/favorites`, { timeout: 2500 });
    const favs = Array.isArray(favRes.data) ? favRes.data : [];
    const isFav = favs.some(v => String(v.id) === String(vehicleId));

    if (isFav) {
      await axios.delete(`${BACKEND_URL}/users/${userId}/favorites/${vehicleId}`, { timeout: 2500 });
      return res.json({ ok: true, favorite: false });
    } else {
      await axios.post(`${BACKEND_URL}/users/${userId}/favorites/${vehicleId}`, null, { timeout: 2500 });
      return res.json({ ok: true, favorite: true });
    }
  } catch (error) {
    const upstreamStatus = error.response?.status || 0;
    const upstreamData = error.response?.data || null;
    const upstreamUrl = error.config?.url || null;
    const code = error.code || null;
  
    console.error("Toggle favorite error:", {
      code,
      upstreamStatus,
      upstreamUrl,
      upstreamData,
      message: error.message
    });
  
    // 👇 Esto es lo importante: devolver el error REAL al navegador
    return res.status(500).json({
      ok: false,
      error: "Toggle failed",
      upstreamStatus,
      upstreamUrl,
      upstreamData,
      code
    });
  }
});

module.exports = router;