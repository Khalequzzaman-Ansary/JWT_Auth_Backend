/**
 * @swagger
 * /health:
 *   get:
 *     summary: Checks if the service is running
 *     tags: [API Health Check]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
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
/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP for a newly registered user
 *     description: Verifies the OTP sent to the user's email and activates the account.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *           examples:
 *             verifyOtp:
 *               summary: Verify OTP payload
 *               value:
 *                 email: user@example.com
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully OR user already verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *             examples:
 *               verified:
 *                 summary: OTP verified
 *                 value:
 *                   message: OTP verified successfully
 *               alreadyVerified:
 *                 summary: User already verified
 *                 value:
 *                   message: User already verified
 *       400:
 *         description: Validation error, invalid OTP, or OTP missing/expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               missingFields:
 *                 value:
 *                   error: Email and OTP are required
 *               invalidEmail:
 *                 value:
 *                   error: Invalid email format
 *               otpMissing:
 *                 value:
 *                   error: OTP not found or expired
 *               otpExpired:
 *                 value:
 *                   error: OTP expired. Please register again.
 *               invalidOtp:
 *                 value:
 *                   error: Invalid OTP
 *       404:
 *         description: No pending registration found for this email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No pending registration found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user and get a JWT
 *     tags: [Auth]
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
/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged-in user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
