import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { registerSchema, loginSchema, resetPasswordSchema } from '../utils/validation';
import { JWTService } from '../services/jwt.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config/config';
import { db } from '../model/user.model';
import { ErrorResponse } from '../utils/errorResponse';
import { asyncHandler } from '../middleware/async.middleware';

const googleClient = new OAuth2Client(config.oauth.google.clientId);

/**
 * @description Resend OTP
 * @route `/auth/resend-otp`
 * @access Public
 * @type POST
 */
export const resendOTP = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { email } = req.body;
        if (!email) {
            return next(new ErrorResponse('Email is required', 400));
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(new ErrorResponse('Invalid email format', 400));
        }

        try {
            // Find user (normalize email to handle case sensitivity)
            const normalizedEmail = email.trim().toLowerCase();
            const user = await db.findUserByEmail(normalizedEmail);

            if (!user) {
                return next(new ErrorResponse('User not found. Please register first.', 404));
            }

            // Check if user is already verified
            if (user.isEmailVerified) {
                return next(new ErrorResponse('Email already verified', 400));
            }

            // Delete existing OTP if any
            await db.deleteVerificationTokenByUserId(user.id);

            // Generate new OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await db.createVerificationToken(user.id, otp, expiresAt);

            // Send OTP email (commented out for now)
            // await EmailService.sendOTPEmail(email, otp);

            res.json({
                success: true,
                message: 'New OTP sent successfully. Check your logs or database for the OTP.',
            });
        } catch (error) {
            return next(new ErrorResponse('Internal server error', 500));
        }
    },
);

/**
 * @description Register user with OTP
 * @route `/auth/register`
 * @access Public
 * @type POST
 */
export const register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return next(new ErrorResponse(error.details[0].message, 400));
        }

        const { email, password } = value;

        // Check if user already exists
        const existingUser = await db.findUserByEmail(email);
        if (existingUser) {
            return next(new ErrorResponse('User already exists', 409));
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await db.createUser({
            email,
            password: hashedPassword,
            isEmailVerified: false,
        });

        // Generate OTP (6-digit number)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await db.createVerificationToken(user.id, otp, expiresAt);

        // Send OTP email (commented out for now)
        // await EmailService.sendOTPEmail(email, otp);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for OTP verification.',
            userId: user.id,
        });
    },
);

/**
 * @description Verify OTP
 * @route `/auth/verify-otp`
 * @access Public
 * @type POST
 */
export const verifyOTP = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return next(new ErrorResponse('Email and OTP are required', 400));
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(new ErrorResponse('Invalid email format', 400));
        }

        // Validate OTP format (6-digit numeric)
        if (!/^\d{6}$/.test(otp)) {
            return next(new ErrorResponse('OTP must be a 6-digit number', 400));
        }

        try {
            // Find user (normalize email to handle case sensitivity)
            const normalizedEmail = email.trim().toLowerCase();
            const user = await db.findUserByEmail(normalizedEmail);

            if (!user) {
                return next(new ErrorResponse('User not found. Please register first.', 404));
            }

            // Find verification token
            const verificationData = await db.findVerificationTokenByUserId(user.id);

            if (!verificationData) {
                return next(new ErrorResponse('No OTP found. Request a new one.', 400));
            }

            // Check OTP match
            if (verificationData.token !== otp) {
                return next(new ErrorResponse('Invalid OTP', 400));
            }

            // Check if OTP is expired
            if (verificationData.expiresAt < new Date()) {
                return next(new ErrorResponse('OTP has expired. Request a new one.', 400));
            }

            // Update user verification status
            await db.updateUser(user.id, { isEmailVerified: true });

            // Remove verification token
            await db.deleteVerificationToken(otp);

            // Generate tokens
            const tokens = JWTService.generateTokens(user.id);
            await JWTService.storeRefreshToken(user.id, tokens.refreshToken);

            res.json({
                success: true,
                message: 'OTP verified successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    isEmailVerified: true,
                },
                tokens,
            });
        } catch (error) {
            return next(new ErrorResponse('Internal server error', 500));
        }
    },
);
/**
 * @description Login user
 * @route `/auth/login`
 * @access Public
 * @type POST
 */
export const login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return next(new ErrorResponse(error.details[0].message, 400));
        }

        const { email, password } = value;

        // Find user
        const user = await db.findUserByEmail(email);
        if (!user || !user.password) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return next(new ErrorResponse('Please verify your email before logging in', 401));
        }

        // Generate tokens
        const tokens = JWTService.generateTokens(user.id);
        await JWTService.storeRefreshToken(user.id, tokens.refreshToken);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
            },
            tokens,
        });
    },
);

/**
 * @description Logout user
 * @route `/auth/logout`
 * @access Private
 * @type POST
 */
export const logout = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.userId!;
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Blacklist the access token
            await JWTService.blacklistAccessToken(token);
        }

        // Revoke refresh token
        await JWTService.revokeRefreshToken(userId);

        res.json({ success: true, message: 'Logout successful' });
    },
);

/**
 * @description Refresh access token
 * @route `/auth/refresh-token`
 * @access Public
 * @type POST
 */
export const refreshToken = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return next(new ErrorResponse('Refresh token required', 401));
        }

        const decoded = await JWTService.verifyRefreshToken(refreshToken);
        if (!decoded) {
            return next(new ErrorResponse('Invalid refresh token', 403));
        }

        // Generate new tokens
        const tokens = JWTService.generateTokens(decoded.userId);
        await JWTService.storeRefreshToken(decoded.userId, tokens.refreshToken);

        res.json({ success: true, tokens });
    },
);

/**
 * @description Request password reset
 * @route `/auth/forgot-password`
 * @access Public
 * @type POST
 */
export const forgotPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { email } = req.body;
        if (!email) {
            return next(new ErrorResponse('Email is required', 400));
        }

        const user = await db.findUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not
            res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent.',
            });
            return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.createResetToken(user.id, resetToken, expiresAt);

        // Send reset email
        // await EmailService.sendPasswordResetEmail(email, resetToken);

        res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent.',
        });
    },
);

/**
 * @description Reset password
 * @route `/auth/reset-password`
 * @access Public
 * @type POST
 */
export const resetPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) {
            return next(new ErrorResponse(error.details[0].message, 400));
        }

        const { token, newPassword } = value;

        // Find reset token
        const resetTokenData = await db.findResetToken(token);
        if (!resetTokenData) {
            return next(new ErrorResponse('Invalid or expired reset token', 400));
        }

        // Find user
        const user = await db.findUserById(resetTokenData.userId);
        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await db.updateUser(user.id, { password: hashedPassword });

        // Remove reset token
        await db.deleteResetToken(token);

        // Revoke all refresh tokens for this user
        await JWTService.revokeRefreshToken(user.id);

        res.json({ success: true, message: 'Password reset successful' });
    },
);

/**
 * @description Verify email
 * @route `/auth/verify-email`
 * @access Public
 * @type POST
 */
export const verifyEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { token } = req.body;
        if (!token) {
            return next(new ErrorResponse('Verification token is required', 400));
        }

        // Find verification token
        const verificationData = await db.findVerificationToken(token);
        if (!verificationData) {
            return next(new ErrorResponse('Invalid or expired verification token', 400));
        }

        // Find and update user
        const user = await db.findUserById(verificationData.userId);
        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        await db.updateUser(user.id, { isEmailVerified: true });

        // Remove verification token
        await db.deleteVerificationToken(token);

        res.json({ success: true, message: 'Email verified successfully' });
    },
);

/**
 * @description Google login
 * @route `/auth/google-login`
 * @access Public
 * @type POST
 */
export const googleLogin = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { token } = req.body;
        if (!token) {
            return next(new ErrorResponse('Google token is required', 400));
        }

        try {
            // Verify Google token
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: config.oauth.google.clientId,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                return next(new ErrorResponse('Invalid Google token', 400));
            }

            const { sub: googleId, email, email_verified } = payload;

            // Find or create user
            let user = await db.findUserBySocialId(googleId, 'google');

            if (!user) {
                // Check if user exists with same email
                const existingUser = await db.findUserByEmail(email!);
                if (existingUser) {
                    return next(new ErrorResponse('User with this email already exists', 409));
                }

                // Create new user
                user = await db.createUser({
                    email: email!,
                    socialId: googleId,
                    socialProvider: 'google',
                    isEmailVerified: email_verified || false,
                });
            }

            // Generate tokens
            const tokens = JWTService.generateTokens(user.id);
            await JWTService.storeRefreshToken(user.id, tokens.refreshToken);

            res.json({
                success: true,
                message: 'Google login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                },
                tokens,
            });
        } catch (error) {
            return next(new ErrorResponse('Google authentication failed', 400));
        }
    },
);
