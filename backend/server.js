const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const habitRoutes = require("./routes/habit-routes");
const checkinRoutes = require('./routes/checkinRoutes');

const userRoutes = require("./routes/user-routes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const authenticateToken = require("./middleware/authenticateToken");

const prisma = new PrismaClient();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use('/habits', habitRoutes);
app.use('/checkins', checkinRoutes);
app.use('/users', userRoutes);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'your-database-connection-string-here',
});

app.locals.db = pool;

app.get('/test', (req, res) => res.json({ ok: true }));


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "habitat.no.reply.signup@gmail.com",
    pass: "avvgridknyaijgjd", 
  },
  connectionTimeout: 10000,
});

// const authenticate = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   const token = authHeader?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Invalid token format" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // contains userId
//     next();
//   } catch (error) {
//     return res.status(403).json({ message: "Invalid token" });
//   }
// };


app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email?.trim();

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
   
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    return res.json({
      message: "Login successful",
      token,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});


app.post("/signup", async (req, res) => {
  try {
    let { email, password, firstName, lastName } = req.body;

    email = email?.trim().toLowerCase();
    firstName = firstName?.trim();
    lastName = lastName?.trim();

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({
    message: "Invalid email format",
  });
}

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {

      if (!existingUser.isVerified) {
        return res.status(403).json({
          message: "Please verify your email first.",
        });
      }

      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isVerified: false,
        verificationCode: code,
        codeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    await transporter.sendMail({
      from: "habitat.no.reply.signup@gmail.com",
      to: email,
      subject: "Verify your account",
      text: `Your verification code is: ${code}`,
    });


    return res.status(201).json({
      message: "User created. Check your email for verification code.",
      // userId: newUser.id,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({
        message: "Invalid code",
      });
    }

    if (new Date() > user.codeExpires) {
      return res.status(400).json({
        message: "Code expired",
        expired: true,
      });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpires: null,
      },
    });

    return res.json({
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
});


app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: code,
        codeExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await transporter.sendMail({
      from: "habitat.no.reply.signup@gmail.com",
      to: email,
      subject: "Reset your password",
      text: `Your reset code is: ${code}`,
    });

    return res.json({
      message: "Reset code sent",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid code" });
    }

    if (new Date() > user.codeExpires) {
      return res.status(400).json({ message: "Code expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        verificationCode: null,
        codeExpires: null,
      },
    });

    res.json({ message: "Password updated" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: newCode,
        codeExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await transporter.sendMail({
      from: "habitat.no.reply.signup@gmail.com",
      to: email,
      subject: "New Verification Code",
      text: `Your new code is: ${newCode}`,
    });

    return res.json({ message: "New code sent" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/checkins", authenticateToken, async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.userId;

  try {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);

    const checkins = await prisma.habitCheckIn.findMany({
      where: {
        habit: { userId },
        date: {
          gte: start,
          lt: end,
        },
      },
      include: {
        habit: true,
      },
    });

    res.json(checkins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching check-ins" });
  }
});

app.post("/checkins", authenticateToken, async (req, res) => {
  const { habitId, date, completed, difficultyRating, notes } = req.body;

  try {
    const checkin = await prisma.habitCheckIn.upsert({
      where: {
        habitId_date: {
          habitId,
          date: new Date(date),
        },
      },
      update: {
        completed,
        difficultyRating,
        notes,
      },
      create: {
        habitId,
        date: new Date(date),
        completed,
        difficultyRating,
        notes,
      },
    });

    res.json(checkin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving check-in" });
  }
});

app.patch("/checkins/:habitId", authenticateToken, async (req, res) => {
  const { habitId } = req.params;
  const { date, completed } = req.body;

  try {
    const updated = await prisma.habitCheckIn.update({
      where: {
        habitId_date: {
          habitId,
          date: new Date(date),
        },
      },
      data: {
        completed,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating check-in" });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "You accessed a protected route",
    userId: req.user.userId,
  });
});

// establishing routes for different screens
app.use("/dashboard", dashboardRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;