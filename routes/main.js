const multer = require("multer");
const FormData = require("form-data");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 15, fileSize: 8 * 1024 * 1024 }
});

const PHP_UPLOAD_VEHICLE_URL =
  "https://darkorchid-chicken-425842.hostingersite.com/upload-image-vehicles.php";

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
    if (st !== 404) {
      throw e;
    }
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
    if (!vehicleId) {
      throw new Error("Backend did not return vehicle id");
    }

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