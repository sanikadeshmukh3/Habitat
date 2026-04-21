const express = require("express");
const { Pool } = require("pg");
const habitRoutes = require("./routes/habit-routes");
const checkinRoutes = require("./routes/checkinRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/user-routes");
const stackingRoutes = require('./routes/stacking')

const dashboardRoutes = require("./routes/dashboardRoutes");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const authenticateToken = require("./middleware/authenticateToken");

const prisma = require("./lib/prisma");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use("/habits", habitRoutes);
app.use("/checkins", checkinRoutes);
app.use("/users", userRoutes);
app.use('/stacking', stackingRoutes);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "your-database-connection-string-here",
});

app.locals.db = pool;

app.get("/test", (req, res) => res.json({ ok: true }));

const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("API KEY:", process.env.SENDGRID_API_KEY);

/*const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY, 
  },
  connectionTimeout: 10000,
});*/

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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
      },
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

    // 1. Sanitization
    email = email?.trim().toLowerCase();
    firstName = firstName?.trim();
    lastName = lastName?.trim();

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // 3. Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        return res.status(403).json({ message: "Please verify your email first." });
      }
      return res.status(400).json({ message: "User already exists" });
    }

    // 4. GENERATE USERNAME (Emily + 3 random digits)
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const generatedUsername = `${firstName.toLowerCase()}${randomDigits}`;

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Create the user with the new username field
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username: generatedUsername, // This satisfies your Prisma requirement
        isVerified: false,
        verificationCode: code,
        codeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // 6. SendGrid Logic
    try {
      await sgMail.send({
        from: "habitat.no.reply.signup@gmail.com",
        to: email,
        subject: "Verify your account",
        text: `Your verification code is: ${code}`,
      });
      console.log(`Email sent to ${email}. Username created: @${generatedUsername}`);
    } catch (err) {
      // We log the error but don't stop the process because the user is already in the DB
      console.error("SendGrid error:", err.response?.body || err);
    }

    // 7. Success Response
    return res.status(201).json({
      message: "User created. Check your email for verification code.",
      userId: newUser.id, // Returning this so your frontend can store it!
      username: newUser.username
    });

  } catch (error) {
    console.error("🔥 SIGNUP CRASH:", error);
    return res.status(500).json({ message: "Server error" });
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
        codeExpires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sgMail.send({
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
        codeExpires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log("SENDING EMAIL...");

    await sgMail.send({
      from: "habitat.no.reply.signup@gmail.com",
      to: email,
      subject: "New Verification Code",
      text: `Your new code is: ${newCode}`,
    });

    console.log("EMAIL SENT ✅");

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

app.get("/users/search", async (req, res) => {
  try {
    console.log("🔥 SEARCH ROUTE HIT");
    
    // Safely extract and clean the query
    const rawQuery = req.query.query;
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

    console.log(`RAW QUERY PARAM: "${query}"`);

    if (!query) {
      return res.status(200).json([]);
    }

    // Split query by spaces to support full name searches
    const terms = query.split(/\s+/);
    const searchConditions = terms.map(term => ({
      OR: [
        { username: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    }));

    const users = await prisma.user.findMany({
      where: { AND: searchConditions },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
      take: 20 // Good practice: limit the number of results
    });

    console.log(`Found ${users.length} users`);
    
    // Guarantee we return an array, never null
    return res.status(200).json(users || []);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json([]); // Guarantee we return an array on error
  }
});


app.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      habit: true,
    },
  });

  res.json(user);
});


app.post("/friend/request", async (req, res) => {
  try {
    const { senderId, friendId } = req.body;

    // 1. Check if already friends
    const user = await prisma.user.findUnique({
      where: { id: senderId },
      include: { friends: true },
    });

    if (user.friends.some(f => f.id === friendId)) {
      return res.status(400).json({ error: "Already friends" });
    }

    // 2. Check if request already sent
    const existingRequest = await prisma.friendRequest.findFirst({
      where: { senderId, receiverId: friendId, status: "PENDING" },
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Request already sent" });
    }

    // 3. Create the request
    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId: friendId },
    });

    res.json(request);
  } catch (err) {
    console.error("Friend request creation failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/friend/requests", async (req, res) => {
  const { userId } = req.query;

  const requests = await prisma.friendRequest.findMany({
    where: {
      receiverId: userId,
      status: "PENDING",
    },
    include: {
      sender: true,
    },
  });

  res.json(requests);
});

app.post("/friend/accept", async (req, res) => {
  const { requestId } = req.body;

  const request = await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  // add to friends list
  await prisma.user.update({
    where: { id: request.senderId },
    data: {
      friends: {
        connect: { id: request.receiverId },
      },
    },
  });

  await prisma.user.update({
    where: { id: request.receiverId },
    data: {
      friends: {
        connect: { id: request.senderId },
      },
    },
  });

  res.json({ success: true });
});

app.post("/friend/reject", async (req, res) => {
  const { requestId } = req.body;

  try {
    await prisma.friendRequest.delete({
      where: { id: requestId },
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

app.get("/users/:id/friends", async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { friends: true },
  });

  res.json(user.friends);
});

app.get("/friend/status", async (req, res) => {
  const { userId, friendId } = req.query;

  // 1. Check if already friends
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { friends: true },
  });

  const isFriend = user.friends.some(f => f.id === friendId);

  if (isFriend) {
    return res.json({ status: "friends" });
  }

  // 2. Check if request already sent
  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      senderId: userId,
      receiverId: friendId,
      status: "PENDING",
    },
  });

  if (existingRequest) {
    return res.json({ status: "requested" });
  }

  // 3. Default
  return res.json({ status: "none" });
}); 

// establishing routes for different screens
app.use("/dashboard", dashboardRoutes);

app.use("/ai", aiRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

app.get("/test", (req, res) => {
  res.send("Server is reachable");
});

module.exports = app;
