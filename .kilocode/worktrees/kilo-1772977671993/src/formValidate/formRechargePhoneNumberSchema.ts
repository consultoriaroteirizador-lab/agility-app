import { z } from 'zod';

export const formRechargePhoneNumberSchema = z.object({
  phoneNumber: z
    .string({ required_error: 'Campo telefone celular obrigatório' })
    .min(1, 'Campo telefone celular obrigatório')
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => /^[1-9]/.test(val), {
      message: 'Número não pode começar com 0',
    })
    .refine((val) => val.length === 11, {
      message: 'Número deve ter 11 dígitos com DDD',
    })

});

export type FormRechargePhoneNumberSchema = z.infer<typeof formRechargePhoneNumberSchema>;
