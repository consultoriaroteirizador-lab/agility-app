import { z } from 'zod';

export const formAliasSchema = z.object({
  nickName: z
    .string()
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 'O apelido deve conter apenas letras')
    .min(2, 'O apelido deve conter ao menos dois caracteres')
    .transform(value => {
      return value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }),
});

export type FormAliasSchema = z.infer<typeof formAliasSchema>;
