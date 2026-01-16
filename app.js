const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();

// 🔐 Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || "drivex-dev-secret", // por si no tienes .env aún
  resave: false,
  saveUninitialized: false
}));

// 👤 Hacer disponible el usuario en TODAS las vistas EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 🎨 Motor de vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 📂 Archivos estáticos (CSS, imágenes, JS del front)
app.use(express.static(path.join(__dirname, "public")));

// 📨 Para leer req.body en POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🛻 Rutas catálogo
const vehiclesRoutes = require("./routes/main");
app.use("/", vehiclesRoutes);

// 🔐 Rutas login / register
const loginRoutes = require("./routes/login");
app.use("/", loginRoutes);

const usersRouter = require("./routes/users");
app.use("/", usersRouter);

const contactRouter = require("./routes/contact");
app.use("/", contactRouter);

const aboutUsRouter = require("./routes/aboutUs");
app.use("/", aboutUsRouter)



// 🚀 Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor Node UI en http://localhost:" + PORT);
});