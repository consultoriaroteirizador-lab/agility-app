/**
 * Links de contato a partir de um telefone cadastrado.
 *
 * O telefone chega do backend como o operador digitou — com máscara, com DDI,
 * sem DDI, ou com lixo. Normalizar aqui, e não no componente, é o que impede
 * que cada tela invente a sua própria regra.
 */

/** Menor comprimento que ainda pode ser um telefone brasileiro com DDD (10 dígitos). */
const MIN_DIGITOS = 10

function apenasDigitos(phone: string): string {
    return phone.replace(/\D/g, '')
}

/**
 * Link do discador. Preserva o `+` inicial quando o cadastro veio em formato
 * internacional — o discador entende, e reescrever isso adivinhando o país
 * seria pior.
 */
export function toTelHref(phone: string | null): string | null {
    if (!phone?.trim()) return null
    const digitos = apenasDigitos(phone)
    if (digitos.length < MIN_DIGITOS) return null
    const internacional = phone.trim().startsWith('+')
    return `tel:${internacional ? '+' : ''}${digitos}`
}

/**
 * O WhatsApp exige DDI. Números cadastrados só com DDD (o caso comum aqui)
 * ganham 55.
 *
 * Devolve os dois links de propósito: o esquema `whatsapp://` só abre se o app
 * estiver instalado, e o chamador decide via `Linking.canOpenURL`. Sem o
 * fallback `wa.me`, o toque no botão não faz nada em celular sem WhatsApp —
 * falha silenciosa.
 */
export function toWhatsAppHrefs(phone: string | null): { app: string; web: string } | null {
    if (!phone?.trim()) return null
    const digitos = apenasDigitos(phone)
    if (digitos.length < MIN_DIGITOS) return null
    const comDDI = digitos.startsWith('55') && digitos.length > 11 ? digitos : `55${digitos}`
    return {
        app: `whatsapp://send?phone=${comDDI}`,
        web: `https://wa.me/${comDDI}`,
    }
}
