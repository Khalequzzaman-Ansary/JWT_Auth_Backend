require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { hash, compare } = require("bcrypt");
const { sign } = require("jsonwebtoken");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { serve, setup } = swaggerUi;
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { validateStrongPassword } = require("./passowrdValidator");
const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Middleware
app.use(cors());
app.use(express.json());

/* --- Swagger Configuration --- */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth Microservice API",
      version: "1.0.0",
      description:
        "Authentication endpoints for our microservices architecture",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
      },
    ],
  },
  apis: [
    "./docs/*.swagger.js",
  ] /* Where Swagger look for documentation comments */,
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", serve, setup(swaggerSpec));

/* --- MICROSERVICE HEALTH CHECK --- */
app.get("/health", (req, res) => {
  res.status(200).json({ service: "Auth Service", status: "Healthy" });
});

/* --- ROUTES --- */

/* [1] Registration Endpoint */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* Validation check */
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    /* Strong password validaton */
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Save user to DB
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "USER",
      },
    });

    res
      .status(201)
      .json({ message: "User registered successfully", userId: newUser.id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* [2] Login Endpoint */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    /* Find user by email */
    const user = await prisma.user.findUnique({ where: { email } });

    /* Check if user has a password (Google-only users won't have a password) */
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* Compare passwords */
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* Generate JWT with real DB data */
    const token = sign(
      { sub: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🔒 Auth Service running on http://localhost:${PORT}`);
});
