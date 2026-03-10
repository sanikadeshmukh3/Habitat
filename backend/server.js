const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

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
        message: "Invalif password"
      });
    }

    return res.json({
      message: "Login successful",
      userId: user.userId
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }


});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
