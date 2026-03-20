
import { isValidCPF } from "./isCpf";
import { isValidEmail, isValidPhoneNumber, isValidPixRandomKey } from "./validation";


export const formatCellphone = (cellphone?: string): string => {
    if (cellphone === null || cellphone === undefined) {
        return "Telefone inválido";
    }

    let formattedCellphone = cellphone.replace(/\D/g, '');
    formattedCellphone = formattedCellphone.replace(/^(\d{2})(\d)/g, "($1) $2");
    formattedCellphone = formattedCellphone.replace(/(\d)(\d{4})$/, "$1-$2");
    return formattedCellphone.slice(0, 15);
};


export function calculateRemainingTime(futureDate: Date): number {
    const currentDate = getUTCSPMilliseconds()
    const differenceInMilliseconds = futureDate.getTime() - currentDate;
    const time = Math.floor(differenceInMilliseconds / 1000);
    console.log(time)
    return time
}

export function getDateFormat(date: Date) {
    return date.getFullYear() + '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
        ('0' + date.getDate()).slice(-2);
}


export function extractNumbers(value: unknown): string {
    if (typeof value === 'string') {
        return value.replace(/\D/g, '');
    }

    return '';
}

export function extractNumberReturnNumber(value: unknown): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = parseInt(value.replace(/[^\d]/g, ''), 10);
        return isNaN(parsed) ? NaN : parsed;
    }
    return NaN;
}
export function extractDecimalNumberCurrency(value: string): number {
    const cleanedValue = value.replace(/[^\d,]/g, '');

    const withoutDots = cleanedValue.replace(/\./g, '');

    const parts = withoutDots.split(',');

    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts.slice(1).join('') : '';

    const finalValue = integerPart + (decimalPart ? '.' + decimalPart : '');

    return parseFloat(finalValue);
}


export function getUTCSPMilliseconds() {
    const now = Date.now();
    const displacementUTC3 = 3 * 3600000;
    return now - displacementUTC3;
}

export function removeCodeCountryPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith("55")) {
        return phoneNumber.substring(2)
    }
    return phoneNumber
}

export function formatPhoneNumberBr(phoneNumber: string): string {
    return extractNumbers(`55${extractNumbers(phoneNumber)}`)
}

export function print(value: any) {
    console.log(value)
}

export function getKeyType(pixKey: string): string {
    const trimmedKey = pixKey.trim(); // Remove espaços extras

    if (isValidCPF(trimmedKey)) return "CPF";
    if (isValidPhoneNumber(trimmedKey)) return "Celular";
    if (isValidPixRandomKey(trimmedKey)) return "Chave Aleatória";
    if (isValidEmail(trimmedKey)) return "E-mail";

    return "Chave PIX";
}



export function getInitialsName(fullname: string): string {
    const words = fullname.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) return "";
    if (words.length === 1) return words[0][0].toUpperCase();

    return words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase();
}