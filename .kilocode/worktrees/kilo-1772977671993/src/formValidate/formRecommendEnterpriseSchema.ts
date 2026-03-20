import { z } from 'zod';

import { extractNumberReturnNumber, extractNumbers } from '@/functions';
import { isValidCNPJ } from '@/functions/isCNPJ';

export const formRecommendEnterpriseSchema = z.object({
  legalName: z
    .string({ required_error: 'Razão social é obrigatória' })
    .min(3, 'Razão social muito curta'),
  taxNumber: z
    .string({ required_error: 'CNPJ é obrigatório' })
    .refine((val) => isValidCNPJ(val), {
      message: 'CNPJ inválido',
    }),
  numberOfCollaborators: z
    .preprocess(
      (val) => extractNumberReturnNumber(val),
      z.number({
        required_error: 'Número de colaboradores é obrigatório',
        invalid_type_error: 'Número de colaboradores deve ser um número',
      })
        .int('Número de colaboradores deve ser um número inteiro') // Adicionado para garantir que seja um número inteiro
        .positive('Número de colaboradores deve ser positivo')
    ),
  contactName: z
    .string({ required_error: 'Nome do contato é obrigatório' })
    .min(2, 'Nome do contato muito curto')
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 'O nome do contato deve conter apenas letras'),
  contactSector: z
    .string({ required_error: 'Setor do contato é obrigatório' })
    .min(2, 'Setor do contato muito curto'),
  email: z
    .string({ required_error: 'E-mail do contato é obrigatório' })
    .email('Formato de e-mail inválido'),
  phoneNumber: z
    .preprocess(
      (val) => extractNumbers(val),
      z.string({ required_error: 'Telefone do contato é obrigatório' })
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos numéricos')
    ),
  whatsAppPhoneNumber: z
    .preprocess(
      (val) => extractNumbers(val),
      z.string({ required_error: 'WhatsApp do contato é obrigatório' })
        .regex(/^\d{11}$/, 'WhatsApp deve ter 11 dígitos numéricos')
    ),
});

export type FormRecommendEnterpriseSchema = z.infer<typeof formRecommendEnterpriseSchema>;
