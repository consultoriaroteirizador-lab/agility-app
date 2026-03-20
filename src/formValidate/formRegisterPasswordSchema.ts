import { z } from 'zod';

export const formRegisterPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres.')
      .max(16, 'A senha deve ter no máximo 16 caracteres.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,16}$/,
        ''
      ),

    passwordConfirmation: z.string(),
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'As senhas não correspondem.',
    path: ['passwordConfirmation'],
  });

export type FormRegisterPasswordSchema = z.infer<
  typeof formRegisterPasswordSchema
>;
