import { z } from 'zod';

export const formSendMessageShoppingSchema = z.object({
  name: z
    .string({ required_error: "Digite o nome do destinatário" })
    .min(4, 'Nome muito curto'),
  email: z
    .string({ required_error: "Digite o email do destinatário" })
    .email('Digite um e-mail válido'),
  message: z
    .string({ required_error: "Digite a mensagem ao destinatário" })
    .min(40, 'Digite a mensagem que deseja enviar com ao menos 20 caracteres'),
});

export type FormSendMessageShoppingSchema = z.infer<typeof formSendMessageShoppingSchema>;
