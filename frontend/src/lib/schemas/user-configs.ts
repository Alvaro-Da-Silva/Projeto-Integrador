import z from "zod";

export const updateUserDataSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
    image: z.union([
        z.instanceof(File, { message: "Por favor, selecione uma imagem." })
            .refine((file) => file.size <= 7 * 1024 * 1024, "A imagem deve ter no máximo 7MB."),
        z.string().nullable().optional()
    ]).optional(),
})

export const updatePasswordSchema = z.object({
    oldPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(24, "A senha deve ter no máximo 24 caracteres."),
    newPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(24, "A senha deve ter no máximo 24 caracteres."),
})


export const updateEmailSchema = z.object({
    newEmail: z.string().email("Por favor insira um e-mail válido.").min(8, "O email deve ter pelo menos 8 caracteres"),
})

export type UpdateUserDataFormSchema = z.infer<typeof updateUserDataSchema>;
export type UpdatePasswordFormSchema = z.infer<typeof updatePasswordSchema>;
export type UpdateEmailFormSchema = z.infer<typeof updateEmailSchema>;