# JWT Auth Backend

A lightweight authentication microservice built with Express, Prisma, and PostgreSQL. It provides user registration with email OTP verification, JWT-based login, and user profile endpoints. The service also includes Swagger documentation for easy exploration of the API.

---

## 🚀 Features

- 🌐 User registration with email normalization and validation
- 🔒 OTP verification (expires after 2 minutes)
- 🔑 JWT login with role-based claims
- 📄 Endpoint to fetch current user details (`/auth/me`)
- 📘 Swagger docs available at `/docs`
- 🧪 Built-in health check at `/health`

---

## 🧩 Prerequisites

- Node.js 18+ (LTS)
- npm or yarn
- PostgreSQL database
- SMTP server credentials for sending OTP emails

---

## ⚙️ Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url> JWT_Auth_Backend
   cd JWT_Auth_Backend/auth-service
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   Create a `.env` file in `auth-service/` based on the example below.

   ```env
   PORT=4000
   DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
   JWT_SECRET=some_super_secret_key
   JWT_EXPIRES_IN=1h

   OTP_PEPPER=optional_pepper_string

   # SMTP settings (required for OTP emails)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=username
   SMTP_PASS=password
   MAIL_FROM="no-reply@example.com"
   ```

4. **Initialize database (Prisma)**

   Ensure your PostgreSQL instance is running and the `DATABASE_URL` is correct.

   ```bash
   npx prisma migrate dev --name init
   # or if you're just generating client:
   npx prisma generate
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The service will start on `http://localhost:4000` (or the port you configured).

---

## 📄 API Endpoints

All endpoints are prefixed with `/auth` unless noted otherwise.

| Method | Route              | Description                          | Auth Required |
| ------ | ------------------ | ------------------------------------ | ------------- |
| GET    | `/health`          | Health check                         | No            |
| POST   | `/auth/register`   | Register a new user (OTP is emailed) | No            |
| POST   | `/auth/verify-otp` | Verify OTP and activate account      | No            |
| POST   | `/auth/login`      | Login and receive JWT                | No            |
| GET    | `/auth/me`         | Retrieve current user information    | Yes (Bearer)  |

> 🔍 Visit **http://localhost:4000/docs** after starting the server to explore the Swagger interface, try out requests, and view models.

---

## 🛠️ Notes

- OTPs are 6-digit numeric codes stored as SHA256 hashes with an optional server-side pepper.
- Unverified users are purged if their OTP expires and they attempt to re-register with the same email.
- Passwords are hashed with `bcrypt` (salt rounds = 10).
- JWT payload contains `sub` (user ID), `role`, and `email`.
- Logging middleware masks sensitive fields such as passwords and tokens.

---

## 🧪 Testing

No automated tests are included yet. You can use tools like Postman, curl, or the Swagger UI to manually exercise the API.

---

## ✅ License

This project is licensed under the ISC License.

---

Happy coding! 🎉
