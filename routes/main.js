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
      apiUrl = `${BACKEND_URL}/vehicles/vehicleType?q=${encodeURIComponent(
        vehicleType
      )}`;
    }

    if (search.trim() !== "") {
      apiUrl = `${BACKEND_URL}/vehicles/search?q=${encodeURIComponent(
        search
      )}`;
    }

    const response = await axios.get(apiUrl);


    let allVehicles;
    if (Array.isArray(response.data)) {
      allVehicles = response.data;
    } else if (Array.isArray(response.data.content)) {

      allVehicles = response.data.content;
    } else {
      console.log("Respuesta rara de /api/vehicles:", response.data);
      allVehicles = [];
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
      });
    }


    res.render("main", {
      vehicles,
      search,
      currentPage,
      totalPages,
      totalVehicles,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error(
      "Error cargando vehículos:",
      error.response?.data || error.message
    );
    res.status(500).send("Error cargando vehículos");
  }
});

router.get("/vehicles/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(`${BACKEND_URL}/vehicles/${id}`);
    const vehicle = response.data;

    res.render("details", { vehicle, user: req.session.user || null });
  } catch (error) {
    console.error("Error cargando vehículo:", error.response?.data || error.message);
    return res.status(404).send("Vehículo no encontrado");
  }
});



module.exports = router;