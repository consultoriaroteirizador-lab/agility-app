import { z } from 'zod';

const MIN_AGE = 18;

function getMaximumBirthDate(): Date {
  const today = new Date();
  return new Date(
    today.getFullYear() - MIN_AGE,
    today.getMonth(),
    today.getDate()
  );
}

function getMinimumBirthDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear() - 120, 0, 1);
}

export const formDataUserSchema = z.object({
  fullName: z
    .string({ required_error: 'Campo Nome obrigatório' })
    .min(3, 'Nome muito curto')
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 'O nome deve conter apenas letras')
    .refine(
      value => {
        const words = value.trim().split(/\s+/); // divide o nome completo em palavras
        return words.length >= 2 && words.every(word => word.length >= 2);
      },
      {
        message: 'Nome completo deve conter ao menos dois nomes sem abreviação',
      }
    )
    .transform(value => {
      return value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }),
  birthDate: z
    .date({ required_error: 'Campo Data de nascimento obrigatório' })
    .refine(
      (date) => date <= getMaximumBirthDate(),
      { message: `Idade mínima: ${MIN_AGE} anos` }
    )
    .refine(
      (date) => date >= getMinimumBirthDate(),
      { message: 'Data de nascimento inválida' }
    ),
  email: z.string({ required_error: 'Campo e-mail obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
  phoneNumber: z.string({ required_error: 'Campo telefone celular obrigatório' }),
});

export type FormDataUserSchema = z.infer<typeof formDataUserSchema>;
