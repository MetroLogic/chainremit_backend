import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { db } from '../model/user.model';

export class JWTService {
    static generateTokens(userId: string): { accessToken: string; refreshToken: string } {
        const accessToken = jwt.sign(
            { userId, type: 'access' }, 
            config.jwt.accessSecret as string, 
            {
                expiresIn: config.jwt.accessExpiresIn as any,
            }
        );

        const refreshToken = jwt.sign(
            { userId, type: 'refresh' }, 
            config.jwt.refreshSecret as string, 
            {
                expiresIn: config.jwt.refreshExpiresIn as any,
            }
        );

        return { accessToken, refreshToken };
    }

    static async verifyAccessToken(token: string): Promise<{ userId: string } | null> {
        try {
            const decoded = jwt.verify(token, config.jwt.accessSecret as string) as any;
            if (decoded.type !== 'access') return null;

            // Check if token is blacklisted
            const isBlacklisted = await db.isTokenBlacklisted(token);
            if (isBlacklisted) return null;

            return { userId: decoded.userId };
        } catch (error) {
            return null;
        }
    }

    static async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
        try {
            const decoded = jwt.verify(token, config.jwt.refreshSecret as string) as any;
            if (decoded.type !== 'refresh') return null;

            // Check if refresh token exists in database
            const storedToken = await db.getRefreshToken(decoded.userId);
            if (storedToken !== token) return null;

            return { userId: decoded.userId };
        } catch (error) {
            return null;
        }
    }

    static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        await db.storeRefreshToken(userId, refreshToken);
    }

    static async revokeRefreshToken(userId: string): Promise<void> {
        await db.deleteRefreshToken(userId);
    }

    static async blacklistAccessToken(token: string): Promise<void> {
        await db.blacklistToken(token);
    }
}