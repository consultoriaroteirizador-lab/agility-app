// src/utils/formatDate.ts

import { parseCalendarDay } from '@/functions/dateFunctions';

/**
 * Formats a date string or Date object to Brazilian date format
 * @param date - Date string or Date object
 * @returns Formatted date string (DD/MM/YYYY HH:mm)
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formats a DATE-ONLY (calendar day) field to Brazilian date format (DD/MM/YYYY).
 * Used for `routing.date`, que o backend grava como meia-noite UTC — por isso o dia
 * é extraído via {@link parseCalendarDay} (sem deslocar pelo fuso; ler com getters
 * locais voltava 1 dia em UTC-3). Não use para instantes reais (têm hora própria).
 * @param date - Calendar-day string or Date
 * @returns Formatted date string (DD/MM/YYYY), or '' when invalid
 */
export function formatDateOnly(date: string | Date): string {
    const d = parseCalendarDay(date);
    if (!d) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}
