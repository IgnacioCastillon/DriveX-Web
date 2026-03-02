const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

function requireAuth(req, res, next) {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect("/login");
  }
  next();
}

router.get("/contact", requireAuth, (req, res) => {
  res.render("contact", {
    user: req.session.user || null,
    success: null,
    error: null
  });
});

router.post("/contact", requireAuth, async (req, res) => {
  const { name, email, reason, body } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"DriveX Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Nuevo mensaje de contacto: ${reason}`,
      replyTo: email,
      text: `Nombre: ${name}\nEmail: ${email}\nMotivo: ${reason}\n\nMensaje:\n${body}`
    });

    return res.render("contact", {
      user: req.session.user || null,
      success: "✔ Tu mensaje se ha enviado correctamente.",
      error: null
    });
  } catch (err) {
    console.error("Error enviando correo:", err);
    return res.render("contact", {
      user: req.session.user || null,
      success: null,
      error: "Hubo un problema enviando tu mensaje. Inténtalo más tarde."
    });
  }
});

module.exports = router;