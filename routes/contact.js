const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");  // 👈 faltaba esto
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/?loginRequired=1");
  }
  next();
}

router.get("/contact", requireAuth, (req, res) => {
  res.render("contact", {
    success: null,
    error: null,
  });
});

router.post("/", requireAuth, async (req, res) => {
  const { name, email, reason, body } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"DriveX Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Nuevo mensaje de contacto: ${reason}`,
      replyTo: email,
      text: `
Nombre: ${name}
Email: ${email}
Motivo: ${reason}
Mensaje:
${body}
      `,
    };

    await transporter.sendMail(mailOptions);

    res.render("contact", {
      success: "✔ Tu mensaje se ha enviado correctamente.",
      error: null,
    });
  } catch (err) {
    console.error("Error enviando correo:", err);
    res.render("contact", {
      error: "❌ Hubo un problema enviando tu mensaje. Inténtalo más tarde.",
      success: null,
    });
  }
});

module.exports = router;