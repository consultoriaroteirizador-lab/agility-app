import {z} from 'zod';

import {isValidCPF} from '@/functions/isCpf';

export const formTaxNumberForgotPasswordSchema = z.object({
  taxNumber: z
    .string({required_error: 'Favor preencher o CPF'})
    .min(1, 'Favor preencher o CPF')
    .refine(cpf => isValidCPF(cpf), {message: 'CPF inválido'}),
});

export type FormTaxNumberForgotPasswordSchema = z.infer<
  typeof formTaxNumberForgotPasswordSchema
>;
