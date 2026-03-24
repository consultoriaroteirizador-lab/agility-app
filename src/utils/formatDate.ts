// src/utils/formatDate.ts

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
 * Formats a date string or Date object to Brazilian date format only (no time)
 * @param date - Date string or Date object
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDateOnly(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}
