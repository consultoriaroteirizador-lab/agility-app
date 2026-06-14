import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const formLoginSchema = z.object({
  tenantCode: z
    .string()
    .min(1, 'Código da empresa é obrigatório'),
  // Aceita e-mail OU CPF (11 dígitos, com ou sem máscara). O backend resolve o CPF.
  email: z
    .string()
    .min(1, 'E-mail ou CPF é obrigatório')
    .refine(
      (v) => {
        const value = (v ?? '').trim();
        const digits = value.replace(/\D/g, '');
        return emailRegex.test(value) || digits.length === 11;
      },
      { message: 'Informe um e-mail válido ou um CPF (11 dígitos)' },
    ),
  password: z.string().min(8, 'A senha deve conter ao menos 8 caracteres'),
});

export type FormLoginSchema = z.infer<typeof formLoginSchema>;
