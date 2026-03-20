export function toCNPJMask(cnpj: string | undefined): string {
    if (!cnpj) return "Sem CNPJ"

    cnpj = cnpj.replace(/\D/g, '');
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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
        return cleanedPhone;
    }
}
