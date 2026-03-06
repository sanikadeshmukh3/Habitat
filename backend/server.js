const express = require("express");

const app = express();
app.use(express.json());

// Temporary fake login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const fakeUser = {
    userid: "12345",
    email: "test@test.com",
    password: "password123"
  };

  if (email === fakeUser.email && password === fakeUser.password) {
    return res.json({
      message: "Login successful",
      userId: fakeUser.userid
    });
  }

  return res.status(401).json({
    message: "Invalid credentials"
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
