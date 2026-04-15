import { z } from 'zod';

export const formForgotPasswordSchema = z.object({
  tenantCode: z
    .string({ required_error: 'Código da empresa é obrigatório' })
    .min(1, 'Código da empresa é obrigatório'),
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
});

export type FormForgotPasswordSchema = z.infer<typeof formForgotPasswordSchema>;
