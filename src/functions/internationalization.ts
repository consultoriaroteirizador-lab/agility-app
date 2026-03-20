export function toBrazilianCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function toBrazilianDate(dateParam?: string) {
    if (dateParam === null || dateParam === undefined) {
        return "Data não fornecida";
    }

    const parts = dateParam.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

    if (isNaN(date.getTime())) {
        throw new Error("O parâmetro dateParam não é uma data válida.");
    }

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}


export function toNumberDecimal(value: number) {
    return value.toFixed(2).replace('.', ',');
}


export function toNumberDecimalFromString(formattedString: string): number | null {
    if (!formattedString || formattedString.trim() === '') {
        return null;
    }
    const withoutThousands = formattedString.replace(/\./g, '');
    const withDecimalPoint = withoutThousands.replace(/,/g, '.');

    const num = parseFloat(withDecimalPoint);
    return isNaN(num) ? null : num;
}