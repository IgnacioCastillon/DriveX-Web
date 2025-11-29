const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

router.get("/login", (req, res) => {
  res.render("login");
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 15 },
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const response = await axios.post(`${BACKEND_URL}/auth/login`, {
      email,
      password,
    });

    const user = response.data;

    req.session.isAuthenticated = true;
    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    console.log("Sesión después de login:", req.session);

    res.redirect("/");
  } catch (error) {
    console.error(error.response?.data || error.message);

    req.session.isAuthenticated = false;
    req.session.user = null;

    const errorMessage =
      error.response?.status === 401
        ? "Correo o contraseña incorrectos"
        : "Ha ocurrido un error al iniciar sesión. Inténtalo de nuevo.";

    res.status(401).render("login", {
      error: errorMessage,
      email: req.body.email,
    });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      return res.status(500).send("Error cerrando sesión");
    }

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    await axios.post(`${BACKEND_URL}/auth/register`, req.body);
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(400).send("Error creando usuario");
  }
});



module.exports = router;