export interface User {
    id: string;
    email: string;
    password?: string;
    isEmailVerified: boolean;
    socialId?: string;
    socialProvider?: 'google' | 'apple';
    walletAddress?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
    confirmPassword: string;
}

export interface WalletConnectRequest {
    walletAddress: string;
    signature: string;
    message: string;
}
