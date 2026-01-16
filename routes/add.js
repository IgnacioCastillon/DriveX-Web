const express = require("express");
const router = express.Router();
const axios = require("axios");
const path = require("path");
const FormData = require("form-data");


router.get("/add", (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    res.render("add");
  });
  
  router.post(
    "/addVehicle",
    upload.array("photos", 15),
    async (req, res) => {
      try {
        let {
          reference,
          brand,
          model,
          description,
          doors,
          vehicle_type,
          price,
          mileage,
          year,
          hp,
          autonomy,
          average_consumption,
          fuel_type,
        } = req.body;
  
        let extras = req.body.extras;
  
        if (Array.isArray(extras)) {
          extras = extras.join(",");
        } else if (typeof extras === "string") {
        } else {
          extras = null;
        }
  
        const vehicleResponse = await axios.post(`${BACKEND_URL}/vehicles`, {
          reference,
          brand,
          model,
          description,
          doors,
          vehicle_type,
          price,
          mileage,
          year,
          hp,
          autonomy,
          average_consumption,
          fuel_type,
          extras,
        });
  
        const vehicle = vehicleResponse.data;
  
        const files = req.files || [];
  
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file || !file.buffer) continue; 
  
          const cleanBrand = (brand || "car").replace(/\s+/g, "_");
          const cleanModel = (model || "model").replace(/\s+/g, "_");
          const ext = path.extname(file.originalname) || ".jpg";
  
          const finalName = `${cleanBrand}-${cleanModel}-${vehicle.id}-${i + 1}${ext}`;
  
          const form = new FormData();
  
          form.append("photo", file.buffer, {
            filename: finalName,
            contentType: file.mimetype,
          });
  
          form.append("brand", brand || "");
          form.append("model", model || "");
          form.append("vehicle_id", String(vehicle.id));
  

          const uploadRes = await axios.post(
            "https://darkorchid-chicken-425842.hostingersite.com/upload-image.php",
            form,
            { headers: form.getHeaders() }
          );
  
          const imageUrl = uploadRes.data.url;
  
          await axios.post(`${BACKEND_URL}/vehicles/${vehicle.id}/images`, {
            imageUrl,
            isMain: i === 0,
          });
        }
  
        res.redirect("/");
      } catch (err) {
        console.error("ERROR:", err.response?.data || err.message || err);
        res.status(400).send("Error creando vehículo");
      }
    }
  );

  module.exports = router;