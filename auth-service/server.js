require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json());

/* --- Swagger Configuration --- */
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Auth Microservice API',
            version: '1.0.0',
            description: 'Authentication endpoints for our microservices architecture',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 4000}`,
            },
        ],
    },
    apis: ['./server.js'], // Tells Swagger where to look for documentation comments
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* --- MICROSERVICE HEALTH CHECK --- */
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Checks if the Auth service is running
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
    res.status(200).json({ service: 'Auth Service', status: 'Healthy' });
});

// --- ROUTES ---

// 1. Registration Endpoint
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing email or password
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validation check
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        res.status(201).json({ message: "User registered successfully (DB pending)" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 2. Login Endpoint
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user and get a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       500:
 *         description: Internal server error
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // TODO: DB Logic - Find user by email
        // TODO: DB Logic - Compare passwords: const isMatch = await bcrypt.compare(password, user.password);
        
        // Mocking a successful login for now
        const mockUserId = "12345"; 
        const mockUserRole = "USER";

        // Generate JWT
        const token = jwt.sign(
            { sub: mockUserId, role: mockUserRole, email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } // Token expires in 1 day
        );

        res.status(200).json({ 
            message: "Login successful", 
            token,
            user: { id: mockUserId, email, role: mockUserRole }
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