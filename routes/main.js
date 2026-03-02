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

async function postWithRetry(url, data, config, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.post(url, data, config);
    } catch (e) {
      lastErr = e;
      const status = e.response?.status;
      if (status && status < 500) throw e;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function saveImagesToBackend(vehicleId, imageUrls) {
  for (let i = 0; i < imageUrls.length; i++) {
    await postWithRetry(
      `${BACKEND_URL}/vehicles/${vehicleId}/images`,
      { imageUrl: imageUrls[i], isMain: i === 0 },
      {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        timeout: 30000
      },
      3
    );

    await new Promise(r => setTimeout(r, 150));
  }
}

function norm(s) {
  return String(s || "").toLowerCase().trim();
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildBaseQuery(queryObj) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(queryObj || {})) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      v.forEach(x => {
        const val = String(x ?? "").trim();
        if (val !== "") params.append(k, val);
      });
    } else {
      const val = String(v ?? "").trim();
      if (val !== "") params.set(k, val);
    }
  }
  return params.toString();
}

router.get("/", async (req, res) => {
  const search = req.query.search || "";
  const vehicleType = req.query.vehicleType || "";
  const page = parseInt(req.query.page || "1", 10);
  const perPage = 14;
  const partial = req.query.partial === "1";

  const filters = {
    brand: (req.query.brand || "").trim(),
    vehicleType: (req.query.vehicleType || "").trim(),
    fuelType: (req.query.fuelType || "").trim(),
    minYear: req.query.minYear ? Number(req.query.minYear) : null,
    maxYear: req.query.maxYear ? Number(req.query.maxYear) : null,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : null,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : null,
    maxMileage: req.query.maxMileage ? Number(req.query.maxMileage) : null,
    offers: (req.query.offers || "").trim(),
    extras: [].concat(req.query.extras || []).map(x => String(x).trim()).filter(Boolean),
    sort: (req.query.sort || "").trim()
  };

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

    const availableTypes = Array.from(
      new Set(allVehicles.map(v => v.vehicleType).filter(Boolean))
    ).sort();

    const availableFuels = Array.from(
      new Set(allVehicles.map(v => (v.fuelType || v.fuel_type)).filter(Boolean))
    ).sort();

    let filtered = allVehicles;

    if (filters.brand) {
      const b = norm(filters.brand);
      filtered = filtered.filter(v => norm(v.brand).includes(b));
    }

    if (filters.vehicleType && !filters.vehicleType.includes(",")) {
      const t = norm(filters.vehicleType);
      filtered = filtered.filter(v => norm(v.vehicleType).includes(t));
    }

    if (filters.fuelType) {
      const f = norm(filters.fuelType);
      filtered = filtered.filter(v => norm(v.fuelType || v.fuel_type).includes(f));
    }

    if (filters.minYear !== null) {
      filtered = filtered.filter(v => (num(v.year) ?? 0) >= filters.minYear);
    }
    if (filters.maxYear !== null) {
      filtered = filtered.filter(v => (num(v.year) ?? 9999) <= filters.maxYear);
    }

    if (filters.minPrice !== null) {
      filtered = filtered.filter(v => (num(v.price) ?? 0) >= filters.minPrice);
    }
    if (filters.maxPrice !== null) {
      filtered = filtered.filter(v => (num(v.price) ?? Number.MAX_SAFE_INTEGER) <= filters.maxPrice);
    }

    if (filters.maxMileage !== null) {
      filtered = filtered.filter(v => (num(v.mileage) ?? 0) <= filters.maxMileage);
    }

    if (filters.offers === "Yes") {
      filtered = filtered.filter(v => String(v.offers) === "Yes");
    }

    if (filters.extras.length > 0) {
      const wanted = filters.extras.map(norm).filter(Boolean);
      filtered = filtered.filter(v => {
        const hay = norm(v.extras);
        return wanted.every(w => hay.includes(w));
      });
    }

    switch (filters.sort) {
      case "priceAsc":
        filtered.sort((a, b) => (num(a.price) ?? 0) - (num(b.price) ?? 0));
        break;
      case "priceDesc":
        filtered.sort((a, b) => (num(b.price) ?? 0) - (num(a.price) ?? 0));
        break;
      case "yearDesc":
        filtered.sort((a, b) => (num(b.year) ?? 0) - (num(a.year) ?? 0));
        break;
      case "mileageAsc":
        filtered.sort((a, b) => (num(a.mileage) ?? 0) - (num(b.mileage) ?? 0));
        break;
      default:
        break;
    }

    allVehicles = filtered;

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

    const baseQuery = buildBaseQuery(req.query);

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
        filters,
        baseQuery,
        availableTypes,
        availableFuels
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
      filters,
      baseQuery,
      availableTypes,
      availableFuels
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

    const baseQuery = buildBaseQuery(req.query);

    const availableTypes = Array.from(new Set(mockVehicles.map(v => v.vehicleType).filter(Boolean))).sort();
    const availableFuels = Array.from(new Set(mockVehicles.map(v => v.fuelType).filter(Boolean))).sort();

    return res.render("main", {
      vehicles: mockVehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: mockVehicles.length,
      user: req.session.user || null,
      favoriteIds: [],
      isFavouritesPage: false,
      filters: {
        brand: (req.query.brand || "").trim(),
        vehicleType: (req.query.vehicleType || "").trim(),
        fuelType: (req.query.fuelType || "").trim(),
        minYear: req.query.minYear ? Number(req.query.minYear) : null,
        maxYear: req.query.maxYear ? Number(req.query.maxYear) : null,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : null,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : null,
        maxMileage: req.query.maxMileage ? Number(req.query.maxMileage) : null,
        offers: (req.query.offers || "").trim(),
        extras: [].concat(req.query.extras || []).map(x => String(x).trim()).filter(Boolean),
        sort: (req.query.sort || "").trim()
      },
      baseQuery,
      availableTypes,
      availableFuels
    });
  }
});

router.get("/favourites", requireLoginPage, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const response = await axios.get(`${BACKEND_URL}/favourites/${userId}`, { timeout: 2500 });
    const vehicles = Array.isArray(response.data) ? response.data : [];

    const availableTypes = Array.from(new Set(vehicles.map(v => v.vehicleType).filter(Boolean))).sort();
    const availableFuels = Array.from(new Set(vehicles.map(v => (v.fuelType || v.fuel_type)).filter(Boolean))).sort();

    return res.render("main", {
      vehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: vehicles.length,
      user: req.session.user,
      favoriteIds: vehicles.map(v => v.id),
      isFavouritesPage: true,

      filters: {
        brand: "",
        vehicleType: "",
        fuelType: "",
        minYear: null,
        maxYear: null,
        minPrice: null,
        maxPrice: null,
        maxMileage: null,
        offers: "",
        extras: [],
        sort: ""
      },
      baseQuery: "",
      availableTypes,
      availableFuels
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

      filters: {
        brand: "",
        vehicleType: "",
        fuelType: "",
        minYear: null,
        maxYear: null,
        minPrice: null,
        maxPrice: null,
        maxMileage: null,
        offers: "",
        extras: [],
        sort: ""
      },
      baseQuery: "",
      availableTypes: [],
      availableFuels: []
    });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/vehicles/offers`, { timeout: 2500 });

    let vehicles = [];
    if (Array.isArray(response.data)) vehicles = response.data;
    else if (Array.isArray(response.data.content)) vehicles = response.data.content;

    const availableTypes = Array.from(new Set(vehicles.map(v => v.vehicleType).filter(Boolean))).sort();
    const availableFuels = Array.from(new Set(vehicles.map(v => (v.fuelType || v.fuel_type)).filter(Boolean))).sort();

    let favoriteIds = [];
    if (req.session.user && req.session.user.id) {
      try {
        const userId = req.session.user.id;
        const favRes = await axios.get(`${BACKEND_URL}/favourites/${userId}`, { timeout: 2500 });
        if (Array.isArray(favRes.data)) favoriteIds = favRes.data.map(v => v.id);
      } catch (e) {
        favoriteIds = [];
      }
    }

    return res.render("main", {
      vehicles,
      search: "",
      currentPage: 1,
      totalPages: 1,
      totalVehicles: vehicles.length,
      user: req.session.user || null,
      favoriteIds,
      isFavouritesPage: false,

      filters: {
        brand: "",
        vehicleType: "",
        fuelType: "",
        minYear: null,
        maxYear: null,
        minPrice: null,
        maxPrice: null,
        maxMileage: null,
        offers: "Yes",
        extras: [],
        sort: ""
      },
      baseQuery: "",
      availableTypes,
      availableFuels
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
      isFavouritesPage: false,

      filters: {
        brand: "",
        vehicleType: "",
        fuelType: "",
        minYear: null,
        maxYear: null,
        minPrice: null,
        maxPrice: null,
        maxMileage: null,
        offers: "Yes",
        extras: [],
        sort: ""
      },
      baseQuery: "",
      availableTypes: [],
      availableFuels: []
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
      await saveImagesToBackend(vehicleId, imageUrls);
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