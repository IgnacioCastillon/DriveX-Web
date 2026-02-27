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



module.exports = router;