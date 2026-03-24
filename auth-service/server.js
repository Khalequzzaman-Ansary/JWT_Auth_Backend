require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { hash, compare } = require("bcrypt");
const { sign, verify } = require("jsonwebtoken");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { serve, setup } = swaggerUi;
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { validateStrongPassword } = require("./passowrdValidator");
const { validateEmail } = require("./emailValidator");
const { randomInt, createHash } = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/* Middleware */
app.use(cors());
app.use(express.json());

/* Log every successful response */
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const safeBody = { ...req.body };

      /* Mask sensitive fields */
      if (safeBody.password) safeBody.password = "***";
      if (safeBody.confirmPassword) safeBody.confirmPassword = "***";
      if (safeBody.token) safeBody.token = "***";

      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - startedAt}ms`,
        { body: safeBody },
      );
    }
  });
  next();
});

/* OTP Helper */
const OTP_TTL_MS = 2 * 60 * 1000;
const normalizeEmail = (email) => email.trim().toLowerCase();
const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

const hashOtp = (otp) =>
  createHash("sha256")
    .update(`${otp}:${process.env.OTP_PEPPER || "dev-pepper"}`)
    .digest("hex");

async function purgeExpiredUnverifiedUserByEmail(email) {
  await prisma.user.deleteMany({
    where: {
      email,
      isVerified: false,
      otpExpiresAt: { lt: new Date() },
    },
  });
}

/* NodeMailer send OTP email */
async function sendOtpEmail(email, otp) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.MAIL_FROM
  ) {
    throw new Error("SMTP env vars missing");
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Feedback Flow OTP Verification",
    text: `Your OTP is ${otp}. It expires in 2 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5">
        <h2>OTP for Feedback Flow Registration</h2>
        <p>Your OTP is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p>This code expires in <b>2 minutes</b>.</p>
        <p>If you didn’t request this, ignore this email.</p>
        <p>All rights reserved © Feedback Flow 2026</p>
      </div>
    `,
  });
}

/* NodeMailer Transporter */
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* Private Route Guard */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = verify(token, process.env.JWT_SECRET);
    req.auth = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* --- Swagger Configuration --- */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Feedback Flow Backend",
      version: "1.0.0",
      description: "Authentication endpoints for microservices architecture",
    },
    servers: [
      {
        url:
          process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "docs", "*.swagger.js"),
  ] /* Swagger documentation comments path*/,
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get("/openapi.json", (req, res) => {
  res.json(swaggerSpec);
});

app.get("/docs", (req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Swagger UI</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        <style>
          body { margin: 0; background: #fafafa; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>

        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            SwaggerUIBundle({
              url: "/openapi.json",
              dom_id: "#swagger-ui"
            });
          };
        </script>
      </body>
    </html>
  `);
});

/* --- MICROSERVICE HEALTH CHECK --- */
app.get("/health", (req, res) => {
  res.status(200).json({ service: "Auth Service", status: "Healthy" });
});

/* --- ROUTES --- */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Auth Service is live",
    health: "/health",
    docs: "/docs",
  });
});

/* [1] Registration Endpoint */
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* Validation check */
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    /* Email validation check */
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const cleanEmail = normalizeEmail(email); /* Email normalization */
    /* Let expired unverified user re-register */
    await purgeExpiredUnverifiedUserByEmail(cleanEmail);

    /* Check if user already exists */
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({ error: "User already exists" });
      }

      return res.status(409).json({
        error:
          "OTP already sent. Please verify within 2 minutes or register again after expiry.",
      });
    }

    /* Strong password validaton */
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    /* Hash password */
    const hashedPassword = await hash(password, 10);

    /* Generate OTP */
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    /* Save unverified user to DB */
    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: "USER",
        isVerified: false,
        otpHash,
        otpExpiresAt,
      },
    });

    /* Send OTP (rollback user if email sending fails) */
    try {
      await sendOtpEmail(cleanEmail, otp);
    } catch (mailError) {
      await prisma.user.delete({ where: { id: newUser.id } });
      throw mailError;
    }

    res.status(201).json({
      message: "User registered. OTP sent to email. Verify within 2 minutes.",
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* [2] Verify OTP Endpoint */
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const cleanEmail = normalizeEmail(email);
    /* Cleanup expired unverified row first */
    await purgeExpiredUnverifiedUserByEmail(cleanEmail);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(404).json({ error: "No pending registration found" });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "User already verified" });
    }
    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    if (user.otpExpiresAt < new Date()) {
      /* Defensive cleanup (in case sweeper/lazy cleanup missed) */
      await prisma.user.delete({ where: { id: user.id } });
      return res
        .status(400)
        .json({ error: "OTP expired. Please register again." });
    }

    if (user.otpHash !== hashOtp(String(otp))) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* [3] Login Endpoint */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }
    const cleanEmail = normalizeEmail(email);
    /* Cleanup expired unverified row if it exists */
    await purgeExpiredUnverifiedUserByEmail(cleanEmail);

    /* Find user by email */
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    /* Check user's OTP verification status */
    if (user && !user.isVerified) {
      return res.status(403).json({ error: "Please verify OTP before login" });
    }

    /* Check if user has a password */
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* Compare passwords */
    const isMatch = await compare(password, user?.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /* Generate JWT with real DB data */
    const token = sign(
      { sub: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* [4] Get User Info */
app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Verify SMTP server on startup */
mailer
  .verify()
  .then(() => console.log("✅ SMTP ready"))
  .catch((err) => console.error("❌ SMTP error:", err.message));

/* --- START SERVER --- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🔒 Auth Service running on http://localhost:${PORT}`);
});
