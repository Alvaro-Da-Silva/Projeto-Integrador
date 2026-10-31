import z from 'zod';

export const loginSchema = z.object({
    email: z.string().email("Por favor insira um e-mail válido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    rememberMe: z.boolean()
})

export const registerSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Por favor insira um e-mail válido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    patent: z.string().min(2, "A patente deve ter pelo menos 2 caracteres"),
    confirmPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Por favor insira um e-mail válido."),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});
    

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
