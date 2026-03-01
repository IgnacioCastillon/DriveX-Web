const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

const PHP_UPLOAD_VEHICLE_URL =
  "https://darkorchid-chicken-425842.hostingersite.com/upload-image.php";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 15, fileSize: 8 * 1024 * 1024 }
});

async function uploadOnePhotoToPHP({ file, brand, model, vehicleId }) {
  const fd = new FormData();

  fd.append("photo", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });

  fd.append("brand", brand || "unknown_brand");
  fd.append("model", model || "unknown_model");
  fd.append("vehicle_id", String(vehicleId || "noid"));

  const resp = await axios.post(PHP_UPLOAD_VEHICLE_URL, fd, {
    headers: fd.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000
  });

  const url = resp.data?.url;
  if (!url) throw new Error("PHP upload did not return url");
  return url;
}

async function saveImagesToBackend(vehicleId, imageUrls, createdVehicle) {
  const imagesPayload = imageUrls.map((u, idx) => ({
    imageUrl: u,
    isMain: idx === 0
  }));

  try {
    await axios.post(`${BACKEND_URL}/vehicles/${vehicleId}/images`, { images: imagesPayload }, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 20000
    });
    return;
  } catch (e) {
    const st = e.response?.status || 0;
    if (st !== 404) throw e;
  }

  const putPayload = {
    ...(createdVehicle || {}),
    id: vehicleId,
    images: imagesPayload
  };

  await axios.put(`${BACKEND_URL}/vehicles/${vehicleId}`, putPayload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    timeout: 20000
  });
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

router.get("/offers", async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/vehicles/offers`, { timeout: 2500 });

    let vehicles = [];
    if (Array.isArray(response.data)) {
      vehicles = response.data;
    } else if (Array.isArray(response.data.content)) {
      vehicles = response.data.content;
    }

    return res.render("main", {
      vehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: vehicles.length,
      user: req.session.user || null,
      favoriteIds: [],
      isFavouritesPage: false
    });
  } catch (error) {
    console.error("Error loading offers:", error.message);

    return res.render("main", {
      vehicles: [],
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: 0,
      user: req.session.user || null,
      favoriteIds: [],
      isFavouritesPage: false
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

router.post("/addVehicle", requireLogin, upload.array("photos", 15), async (req, res) => {
  try {
    const b = req.body || {};
    const files = Array.isArray(req.files) ? req.files : [];

    const extrasArr = b.extras ? ([]).concat(b.extras) : [];
    const extrasStr = extrasArr.join(", ");

    const payload = {
      id: 0,
      reference: b.reference || "",
      brand: b.brand || "",
      model: b.model || "",
      hp: Number(b.hp || 0),
      autonomy: Number(b.autonomy || 0),
      averageconsumption: Number(b.average_consumption || 0),
      description: b.description || "",
      price: Number(b.price || 0),
      year: Number(b.year || 0),
      fuelType: b.fuel_type || "",
      mileage: Number(b.mileage || 0),
      extras: extrasStr,
      doors: Number(b.doors || 0),
      vehicleType: b.vehicle_type || "",
      images: []
    };

    const upstream = await axios.post(`${BACKEND_URL}/vehicles`, payload, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 20000
    });

    const created = upstream.data;
    const vehicleId = created?.id || created?.vehicle?.id;
    if (!vehicleId) throw new Error("Backend did not return vehicle id");

    const imageUrls = [];
    for (const file of files) {
      if (!file.mimetype?.startsWith("image/")) continue;
      const url = await uploadOnePhotoToPHP({
        file,
        brand: b.brand,
        model: b.model,
        vehicleId
      });
      imageUrls.push(url);
    }

    if (imageUrls.length > 0) {
      await saveImagesToBackend(vehicleId, imageUrls, created);
    }

    const accept = req.headers.accept || "";
    const wantsHtml = accept.includes("text/html");

    if (wantsHtml) {
      return res.redirect(`/vehicles/${vehicleId}`);
    }

    return res.status(201).json({
      ok: true,
      message: "Vehicle published successfully",
      vehicleId,
      imageUrls,
      data: created
    });
  } catch (error) {
    const upstreamStatus = error.response?.status || 0;
    const upstreamData = error.response?.data || null;
    const upstreamUrl = error.config?.url || null;
    const code = error.code || null;

    console.error("ADD VEHICLE error:", {
      code,
      upstreamStatus,
      upstreamUrl,
      upstreamData,
      message: error.message
    });

    return res.status(400).json({
      ok: false,
      message: "Add vehicle failed",
      upstreamStatus,
      upstreamUrl,
      upstreamData,
      code
    });
  }
});

module.exports = router;