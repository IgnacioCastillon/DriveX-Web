const express = require("express");
const router = express.Router();
const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

function requireLoginPage(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect("/login");
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }
  next();
}

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

    let favoriteIds = [];
    if (req.session.user && req.session.user.id) {
      try {
        const userId = req.session.user.id;

        // ✅ Backend: GET /api/favourites/{userId}
        const favRes = await axios.get(`${BACKEND_URL}/favourites/${userId}`, { timeout: 2500 });

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

    return res.render("main", {
      vehicles,
      search,
      currentPage,
      totalPages,
      totalVehicles,
      user: req.session.user || null,
      favoriteIds,
      isFavouritesPage: false,
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

    return res.render("main", {
      vehicles: mockVehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: mockVehicles.length,
      user: req.session.user || null,
      favoriteIds: [],
      isFavouritesPage: false,
    });
  }
});

router.get("/favourites", requireLoginPage, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const response = await axios.get(`${BACKEND_URL}/favourites/${userId}`, { timeout: 2500 });
    const vehicles = Array.isArray(response.data) ? response.data : [];

    return res.render("main", {
      vehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: vehicles.length,
      user: req.session.user,
      favoriteIds: vehicles.map(v => v.id),
      isFavouritesPage: true,
    });
  } catch (error) {
    console.error("Error loading favourites:", error.message);

    return res.render("main", {
      vehicles: [],
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: 0,
      user: req.session.user,
      favoriteIds: [],
      isFavouritesPage: true,
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
      images: [
        { imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad42243261?auto=format&fit=crop&q=80&w=800", isMain: true },
        { imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800", isMain: false }
      ]
    };

    return res.render("details", { vehicle: mockVehicle, user: req.session.user || null });
  }
});

// --------- Toggle favourite ----------
router.post("/favourites/:vehicleId/toggle", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const vehicleId = req.params.vehicleId;

  try {
    const favRes = await axios.get(`${BACKEND_URL}/favourites/${userId}`, { timeout: 2500 });
    const favs = Array.isArray(favRes.data) ? favRes.data : [];
    const isFav = favs.some(v => String(v.id) === String(vehicleId));

    if (isFav) {
      await axios.delete(`${BACKEND_URL}/favourites/${userId}/${vehicleId}`, { timeout: 2500 });
      return res.json({ ok: true, favorite: false });
    } else {
      await axios.post(`${BACKEND_URL}/favourites/${userId}/${vehicleId}`, null, { timeout: 2500 });
      return res.json({ ok: true, favorite: true });
    }
  } catch (error) {
    const upstreamStatus = error.response?.status || 0;
    const upstreamData = error.response?.data || null;
    const upstreamUrl = error.config?.url || null;
    const code = error.code || null;

    console.error("Toggle favourite error:", {
      code,
      upstreamStatus,
      upstreamUrl,
      upstreamData,
      message: error.message
    });

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


const multer = require("multer");
const FormData = require("form-data");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 15, fileSize: 10 * 1024 * 1024 }
});

function toInt(v) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(v) {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

router.post("/addVehicle", requireLogin, upload.array("photos", 15), async (req, res) => {
  const b = req.body || {};

  const payloadJson = {
    brand: b.brand ?? null,
    model: b.model ?? null,
    vehicleType: b.vehicle_type ?? b.vehicleType ?? null,
    year: toInt(b.year),
    price: toFloat(b.price),
    description: b.description ?? null,
    mileage: toInt(b.mileage),
    doors: toInt(b.doors),
    hp: toInt(b.hp),
    fuelType: b.fuel_type ?? b.fuelType ?? null,
    autonomy: toInt(b.autonomy),
    averageConsumption: toFloat(b.average_consumption ?? b.averageConsumption),
    extras: b.extras ? ([]).concat(b.extras) : []
  };

  // 1) Intento MULTIPART
  try {
    const fd = new FormData();

    Object.entries(payloadJson).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (Array.isArray(v)) {
        v.forEach(x => fd.append(k, String(x)));
      } else {
        fd.append(k, String(v));
      }
    });

    (req.files || []).forEach((f) => {
      fd.append("photos", f.buffer, {
        filename: f.originalname || "photo.jpg",
        contentType: f.mimetype
      });
    });

    const upstream = await axios.post(`${BACKEND_URL}/vehicles`, fd, {
      headers: fd.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 20000
    });

    return res.status(201).json({ ok: true, message: "Vehicle published ✅", data: upstream.data });
  } catch (error) {
    const upstreamStatus = error.response?.status || 0;

    // 2) Fallback JSON (sin fotos) si falla
    try {
      const upstream2 = await axios.post(`${BACKEND_URL}/vehicles`, payloadJson, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000
      });

      return res.status(201).json({
        ok: true,
        message: "Vehicle published ✅ (without photos)",
        data: upstream2.data
      });
    } catch (error2) {
      const upstreamStatus2 = error2.response?.status || 0;
      const upstreamData2 = error2.response?.data || null;
      const upstreamUrl2 = error2.config?.url || null;
      const code2 = error2.code || null;

      console.error("ADD VEHICLE failed (multipart and json):", {
        multipartStatus: upstreamStatus,
        jsonStatus: upstreamStatus2,
        jsonUpstreamUrl: upstreamUrl2,
        jsonUpstreamData: upstreamData2,
        code: code2,
        message: error2.message
      });

      return res.status(500).json({
        ok: false,
        message: "Add vehicle failed",
        upstreamStatus: upstreamStatus2,
        upstreamUrl: upstreamUrl2,
        upstreamData: upstreamData2,
        code: code2
      });
    }
  }
});

module.exports = router;