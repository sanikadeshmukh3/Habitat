// setting up the basic express server
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const habitRoutes = require("./routes/habit-routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({message: "API running"})
});

app.use('/habits', (req, res, next) => {
  console.log('Habit route hit'); // Add this to debug
  next();
}, habitRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


///Guys i think this file lowkey does NOTHING because it goes through server.js