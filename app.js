const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || "drivex-dev-secret", 
  resave: false,
  saveUninitialized: false
}));


app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.static(path.join(__dirname, "public")));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const vehiclesRoutes = require("./routes/main");
app.use("/", vehiclesRoutes);


const loginRoutes = require("./routes/login");
app.use("/", loginRoutes);

const usersRouter = require("./routes/users");
app.use("/", usersRouter);

const contactRouter = require("./routes/contact");
app.use("/", contactRouter);

const aboutUsRouter = require("./routes/aboutUs");
app.use("/", aboutUsRouter)

const addRouter = require("./routes/add");
app.use("/", addRouter);   




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor Node UI en http://localhost:" + PORT);
});