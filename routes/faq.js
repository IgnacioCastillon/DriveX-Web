const express = require("express");
const router = express.Router();

router.get("/frequentlyAskedQuestions", (req, res) =>{
    res.render("frequentlyAskedQuestions");
});

module.exports = router;
