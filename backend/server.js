const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const habitRoutes = require("./routes/habit-routes");

const dashboardRoutes = require("./routes/dashboardRoutes");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/habits', habitRoutes);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'your-database-connection-string-here',
});

app.locals.db = pool;

app.get('/test', (req, res) => res.json({ ok: true }));


// Temporary fake login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try{
    const user = await prisma.user.findUnique({
      where: {email: email}
    });

    if(!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }
    if (user.password !== password) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    return res.json({
      message: "Login successful",
      userId: user.id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }


});

// establishing routes for different screens
app.use("/dashboard", dashboardRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
