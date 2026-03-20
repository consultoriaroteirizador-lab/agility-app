export function isValidCNPJ(cnpj: string): boolean {
    const cleanedCNPJ = cnpj.replace(/[^\d]+/g, '');

    if (cleanedCNPJ.length !== 14) {
        return false;
    }

    if (/^(\d)\1{13}$/.test(cleanedCNPJ)) {
        return false;
    }

    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleanedCNPJ.charAt(i)) * pos--;
        if (pos < 2) {
            pos = 9;
        }
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(cleanedCNPJ.charAt(12))) {
        return false;
    }

    sum = 0;
    pos = 6;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cleanedCNPJ.charAt(i)) * pos--;
        if (pos < 2) {
            pos = 9;
        }
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(cleanedCNPJ.charAt(13))) {
        return false;
    }

    return true;
}