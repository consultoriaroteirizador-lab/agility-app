import { z } from 'zod';

export const formLoginSchema = z.object({
  tenantCode: z
    .string()
    .min(1, 'Código da empresa é obrigatório'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z.string().min(8, 'A senha deve conter ao menos 8 caracteres'),
});

export type FormLoginSchema = z.infer<typeof formLoginSchema>;
