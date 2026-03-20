
export function isValidEmail(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
}
export function isValidFullName(name: string): boolean {
    const names = name.trim().split(' ');
    return names.length > 1
}

export function isValidNickName(nickName: string): boolean {
    return nickName.length > 1
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneJustNumber = extractNumbers(phoneNumber)
    return phoneJustNumber.length === 11
}

export function isValidTaxNumber(taxNumber: string): boolean {
    taxNumber = taxNumber.replace(/[^\d]+/g, '');
    if (taxNumber.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(taxNumber)) return false;

    let sum: number = 0;
    let rest: number;

    for (let i = 1; i <= 9; i++)
        sum = sum + parseInt(taxNumber.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(taxNumber.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++)
        sum = sum + parseInt(taxNumber.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(taxNumber.substring(10, 11))) return false;

    return true;
}

export function isPasswordValid(password: string) {
    const isValidLength = password.length >= 8 && password.length <= 16;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return isValidLength && hasLowercase && hasUppercase && hasNumber && hasSpecialCharacter;
}

export function isValidLength(password: string) {
    return password.length >= 8 && password.length <= 16;
}

export function hasLowercase(password: string) {
    return /[a-z]/.test(password);
}

export function hasUppercase(password: string) {
    return /[A-Z]/.test(password);
}

export function hasNumber(password: string) {
    return /\d/.test(password);
}

export function hasSpecialCharacter(password: string) {
    return /[-=\/|+_!@#$%^&*(),.?":{}\[\]|<>]/.test(password);
}

export function isValidPixRandomKey(key: string): boolean {
    const pixRandomKeyRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return pixRandomKeyRegex.test(key);
}

function extractNumbers(value: unknown): string {
    if (typeof value === 'string') {
        return value.replace(/\D/g, '');
    }

    return '';
}