import { Router } from 'express';

import {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    googleLogin,
    resendOTP,
    verifyOTP,
} from '../controller/auth.controller';
import { protect } from '../guard/protect.guard';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/ratelimiter';

const router = Router();

// Register user
router.post('/register', authRateLimiter, register);

// Login user
router.post('/login', authRateLimiter, login);

// Logout user
router.post('/logout', protect, logout);

// Resend verification OTP

// Verify OTP
router.post('/verify/otp', verifyOTP);
router.post('/resend-otp', authRateLimiter, resendOTP);

// Request password reset
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);

// Verify password reset OTP

// Reset password
router.post('/reset-password', resetPassword);

// Verify email
router.post('/verify-email', verifyEmail);

// Google login
router.post('/google-login', authRateLimiter, googleLogin);

export default router;
