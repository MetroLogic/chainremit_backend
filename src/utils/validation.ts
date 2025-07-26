import Joi from 'joi';

export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
            'string.pattern.base':
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
    }),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

export const walletConnectSchema = Joi.object({
    walletAddress: Joi.string().required(),
    signature: Joi.string().required(),
    message: Joi.string().required(),
});
