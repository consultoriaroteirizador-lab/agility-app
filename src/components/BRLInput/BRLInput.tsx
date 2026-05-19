// src/components/BRLInput/BRLInput.tsx

import React, { useEffect, useState } from 'react';

import { Input } from '../Input/Input';

interface BRLInputProps {
    /** Valor atual em centavos (ex: 12345 = R$ 123,45). */
    valueCents?: number | null;
    /** Disparado a cada mudança. Emite centavos ou null. */
    onChangeCents: (cents: number | null) => void;
    /** Máximo permitido em centavos (corta automaticamente). */
    maxCents?: number;
    placeholder?: string;
    disabled?: boolean;
    title?: string;
    messageError?: string;
}

function centsToDisplay(cents: number | null | undefined): string {
    if (cents == null || !Number.isFinite(cents) || cents <= 0) return '';
    const reais = cents / 100;
    return `R$ ${reais.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function inputToCents(input: string): number | null {
    const digits = (input ?? '').replace(/\D/g, '');
    if (!digits) return null;
    const cents = parseInt(digits, 10);
    return Number.isFinite(cents) ? cents : null;
}

/**
 * Input com máscara BRL para entrada de valores em centavos.
 *
 * O usuário digita apenas dígitos e o display formata automaticamente:
 * "12345" → "R$ 123,45". Evita ambiguidade entre vírgula/ponto decimal.
 *
 * Emite o valor em centavos (inteiro) ou null quando vazio.
 */
export function BRLInput({
    valueCents,
    onChangeCents,
    maxCents,
    placeholder = 'R$ 0,00',
    disabled,
    title,
    messageError,
}: BRLInputProps) {
    const [display, setDisplay] = useState(() => centsToDisplay(valueCents));

    // Sincroniza quando o valor externo muda (ex: reset após submit).
    useEffect(() => {
        setDisplay(centsToDisplay(valueCents));
    }, [valueCents]);

    function handleChange(raw: string) {
        let cents = inputToCents(raw);
        if (cents != null && maxCents != null && cents > maxCents) {
            cents = maxCents;
        }
        setDisplay(centsToDisplay(cents));
        onChangeCents(cents);
    }

    return (
        <Input
            placeholder={placeholder}
            value={display}
            onChangeText={handleChange}
            keyboardType="numeric"
            editable={!disabled}
            title={title}
            messageError={messageError}
        />
    );
}
