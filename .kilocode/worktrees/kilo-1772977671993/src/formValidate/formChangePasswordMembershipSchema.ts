import { z } from 'zod';

export const formChangePasswordMembershipSchema = z
  .object({
    password: z
      .string()
      .min(4, 'A senha deve conter quatro caracteres')
      .max(4, 'A senha deve conter quatro caracteres'),

    newPassword: z
      .string()
      .min(4, 'A nova senha deve conter quatro caracteres')
      .max(4, 'A nova senha deve conter quatro caracteres')
      .regex(/^\d+$/, 'A nova senha deve conter apenas números'),

    newPasswordConfirmation: z.string(),
  })
  .refine(data => data.password !== data.newPassword, {
    message: 'A nova senha não pode ser a mesma que a atual',
    path: ['newPassword'], // Corrigido aqui
  })
  .refine(data => data.newPassword === data.newPasswordConfirmation, {
    message: 'As senhas não correspondem.',
    path: ['newPasswordConfirmation'], // Corrigido aqui
  });

export type FormChangePasswordMembershipSchema = z.infer<typeof formChangePasswordMembershipSchema>;
