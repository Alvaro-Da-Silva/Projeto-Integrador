import z from 'zod';
import { PATENTES } from '@/lib/patentes';

export const loginSchema = z.object({
    email: z.string().email("Por favor insira um e-mail válido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    rememberMe: z.boolean()
})

// Mesmas regras do backend (POST /api/usuarios): senha de 12 a 256 caracteres e, para cotista,
// telefone com DDD e data de nascimento obrigatórios.
export const registerSchema = z.object({
    name: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres").max(200, "Nome muito longo"),
    email: z.string().trim().email("Por favor insira um e-mail válido."),
    perfil: z.enum(['cotista', 'admin'], { message: "Selecione o perfil" }),
    patent: z.enum(PATENTES, { message: "Selecione a patente" }),
    telefone: z.string().trim(),
    dataNascimento: z.string(),
    password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres").max(256, "Senha muito longa"),
    confirmPassword: z.string().min(12, "A senha deve ter pelo menos 12 caracteres"),
}).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", message: "As senhas não coincidem", path: ["confirmPassword"] });
    }

    if (data.perfil !== 'cotista') return;

    const digitos = data.telefone.replace(/\D/g, '').length;

    if (!/^[0-9()+\-\s]+$/.test(data.telefone) || digitos < 10 || digitos > 13 || data.telefone.length > 20) {
        ctx.addIssue({ code: "custom", message: "Informe o telefone com DDD", path: ["telefone"] });
    }

    const hoje = new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dataNascimento) || data.dataNascimento < '1900-01-01' || data.dataNascimento >= hoje) {
        ctx.addIssue({ code: "custom", message: "Informe a data de nascimento", path: ["dataNascimento"] });
    }
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
