export function toCNPJMask(cnpj: string | undefined): string {
    if (!cnpj) return "Sem CNPJ"

    const cleaned = cnpj.replace(/\D/g, '');
    // Comprimento inválido: devolve o original (não dígitos-só sem máscara)
    // para que a UI ainda mostre algo legível e o problema fique evidente.
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function toPhoneMask(phone: string | undefined): string {
    if (!phone) {
        return "Sem telefone";
    }

    const cleanedPhone = phone.replace(/\D/g, '');

    if (cleanedPhone.length === 11) {
        return cleanedPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (cleanedPhone.length === 10) {
        return cleanedPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
        // Comprimento fora do esperado: devolve o input original para evitar
        // mostrar string crua sem indicar erro.
        return phone;
    }
}
