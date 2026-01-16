const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "https://drivex-backend-production.up.railway.app/api";

const PHP_UPLOAD_URL =
  "https://darkorchid-chicken-425842.hostingersite.com/upload-image-users.php";


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1 }
});


function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "Admin") {
    return res.status(403).send("Forbidden");
  }
  next();
}




router.get("/users", async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page || "1", 10);
  const perPage = 12;
  const partial = req.query.partial === "1";

  try {
    let apiUrl = `${BACKEND_URL}/users`;

    if (search.trim() !== "") {
      apiUrl = `${BACKEND_URL}/users/search?q=${encodeURIComponent(search)}`;
    }

    const response = await axios.get(apiUrl);

    // Asegurar array
    let allUsers;
    if (Array.isArray(response.data)) {
      allUsers = response.data;
    } else if (Array.isArray(response.data.content)) {
      allUsers = response.data.content;
    } else {
      console.log("Respuesta rara de /api/users:", response.data);
      allUsers = [];
    }

    const totalUsers = allUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const users = allUsers.slice(start, end);

    if (partial) {
      return res.json({
        users,
        search,
        currentPage,
        totalPages,
        totalUsers,
        user: req.session.user || null,
      });
    }

    res.render("users", {
      users,
      search,
      user: req.session.user || null,
      error: null,
    });
  } catch (error) {
    console.error("Error cargando users:", error.response?.data || error.message);
    res.status(500).send("Error cargando users");
  }
});


router.post("/users", requireAdmin, upload.single("photo"), async (req, res) => {
  const { username, email, password_hash, role } = req.body;
  const file = req.file;

  try {
    let profileImageName = null;


    if (file) {
      const formData = new FormData();

      formData.append("photo", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      formData.append("username", username);
      formData.append("user_id", "0");

      const phpResponse = await axios.post(PHP_UPLOAD_URL, formData, {
        headers: formData.getHeaders(),
      });


      profileImageName =
        phpResponse.data.url ||
        phpResponse.data.url ||
        null;
    }


    await axios.post(`${BACKEND_URL}/users`, {
      username,
      email,
      password_hash,
      role,
      profileImage: profileImageName,
    });

    res.redirect("/users");

  } catch (error) {
    console.error("Error creando usuario:", error.response?.data || error.message);

    try {
      const response = await axios.get(`${BACKEND_URL}/users`);
      const allUsers = Array.isArray(response.data)
        ? response.data
        : response.data.content || [];

      res.status(500).render("users", {
        users: allUsers,
        search: "",
        user: req.session.user || null,
        error: "No se ha podido crear el usuario. Revisa los datos.",
      });
    } catch (e2) {
      res.status(500).send("Error creando usuario");
    }
  }
});

module.exports = router;