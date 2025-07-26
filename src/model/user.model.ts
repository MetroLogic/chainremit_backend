import { User } from '../types/user.types';
import crypto from 'crypto';

// In-memory database - replace with your actual database implementation
class Database {
    private users: User[] = [];
    private verificationTokens: Array<{
        token: string;
        userId: string;
        expiresAt: Date;
    }> = [];
    private resetTokens: Array<{
        token: string;
        userId: string;
        expiresAt: Date;
    }> = [];
    private refreshTokens: Map<string, string> = new Map(); // userId -> refreshToken
    private blacklistedTokens: Set<string> = new Set();
    private rateLimitAttempts: Map<string, { count: number; resetTime: number }> = new Map();

    // User methods
    async createUser(userData: Partial<User>): Promise<User> {
        const user: User = {
            id: crypto.randomUUID(),
            email: userData.email || '',
            password: userData.password,
            isEmailVerified: userData.isEmailVerified || false,
            socialId: userData.socialId,
            socialProvider: userData.socialProvider,
            walletAddress: userData.walletAddress,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.users.push(user);
        return user;
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return this.users.find((user) => user.email === email) || null;
    }

    async findUserById(id: string): Promise<User | null> {
        return this.users.find((user) => user.id === id) || null;
    }

    async findUserBySocialId(socialId: string, provider: string): Promise<User | null> {
        return (
            this.users.find(
                (user) => user.socialId === socialId && user.socialProvider === provider,
            ) || null
        );
    }

    async findUserByWalletAddress(walletAddress: string): Promise<User | null> {
        return this.users.find((user) => user.walletAddress === walletAddress) || null;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
        const userIndex = this.users.findIndex((user) => user.id === id);
        if (userIndex === -1) return null;

        this.users[userIndex] = {
            ...this.users[userIndex],
            ...updates,
            updatedAt: new Date(),
        };

        return this.users[userIndex];
    }

    // Verification token methods
    async createVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        this.verificationTokens.push({ token, userId, expiresAt });
    }

    async findVerificationToken(
        token: string,
    ): Promise<{ token: string; userId: string; expiresAt: Date } | null> {
        return (
            this.verificationTokens.find((vt) => vt.token === token && vt.expiresAt > new Date()) ||
            null
        );
    }

    async findVerificationTokenByUserId(
        userId: string,
    ): Promise<{ token: string; userId: string; expiresAt: Date } | null> {
        return (
            this.verificationTokens.find(
                (vt) => vt.userId === userId && vt.expiresAt > new Date(),
            ) || null
        );
    }

    async deleteVerificationToken(token: string): Promise<void> {
        const index = this.verificationTokens.findIndex((vt) => vt.token === token);
        if (index !== -1) {
            this.verificationTokens.splice(index, 1);
        }
    }

    async deleteVerificationTokenByUserId(userId: string): Promise<void> {
        this.verificationTokens = this.verificationTokens.filter((vt) => vt.userId !== userId);
    }

    // Reset token methods
    async createResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        this.resetTokens.push({ token, userId, expiresAt });
    }

    async findResetToken(
        token: string,
    ): Promise<{ token: string; userId: string; expiresAt: Date } | null> {
        return (
            this.resetTokens.find((rt) => rt.token === token && rt.expiresAt > new Date()) || null
        );
    }

    async deleteResetToken(token: string): Promise<void> {
        const index = this.resetTokens.findIndex((rt) => rt.token === token);
        if (index !== -1) {
            this.resetTokens.splice(index, 1);
        }
    }

    // Refresh token methods
    async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        this.refreshTokens.set(userId, refreshToken);
    }

    async getRefreshToken(userId: string): Promise<string | null> {
        return this.refreshTokens.get(userId) || null;
    }

    async deleteRefreshToken(userId: string): Promise<void> {
        this.refreshTokens.delete(userId);
    }

    // Blacklisted token methods
    async blacklistToken(token: string): Promise<void> {
        this.blacklistedTokens.add(token);

        // Clean up expired blacklisted tokens periodically
        setTimeout(
            () => {
                this.blacklistedTokens.delete(token);
            },
            15 * 60 * 1000,
        ); // Remove after 15 minutes (access token expiry)
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        return this.blacklistedTokens.has(token);
    }

    // Rate limiting methods
    async incrementRateLimit(
        key: string,
        windowMs: number,
        maxAttempts: number,
    ): Promise<{ allowed: boolean; remaining: number }> {
        const now = Date.now();
        const attempt = this.rateLimitAttempts.get(key);

        if (!attempt || now > attempt.resetTime) {
            // First attempt or window expired
            this.rateLimitAttempts.set(key, {
                count: 1,
                resetTime: now + windowMs,
            });
            return { allowed: true, remaining: maxAttempts - 1 };
        }

        if (attempt.count >= maxAttempts) {
            return { allowed: false, remaining: 0 };
        }

        attempt.count++;
        return { allowed: true, remaining: maxAttempts - attempt.count };
    }

    // Cleanup expired tokens periodically
    startCleanupTimer(): void {
        setInterval(
            () => {
                const now = new Date();

                // Clean verification tokens
                this.verificationTokens = this.verificationTokens.filter(
                    (vt) => vt.expiresAt > now,
                );

                // Clean reset tokens
                this.resetTokens = this.resetTokens.filter((rt) => rt.expiresAt > now);

                // Clean rate limit attempts
                const currentTime = Date.now();
                for (const [key, attempt] of this.rateLimitAttempts.entries()) {
                    if (currentTime > attempt.resetTime) {
                        this.rateLimitAttempts.delete(key);
                    }
                }
            },
            60 * 60 * 1000,
        ); // Run every hour
    }
}

export const db = new Database();

// Start cleanup timer
db.startCleanupTimer();
