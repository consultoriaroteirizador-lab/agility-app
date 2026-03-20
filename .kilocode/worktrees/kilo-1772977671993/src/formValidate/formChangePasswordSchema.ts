import { z } from 'zod';

export const formChangePasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Favor digitar sua senha atual')
    ,
    newPassword: z
      .string()
      .min(1, 'Favor digitar a nova senha')
      .max(16, '')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,16}$/, ''),

    newPasswordConfirmation: z.string(),
  })
  .refine(data => data.newPassword === data.newPasswordConfirmation, {
    message: 'As senhas não correspondem.',
    path: ['passwordConfirmation'],
  });

export type FormChangePasswordSchema = z.infer<typeof formChangePasswordSchema>;
