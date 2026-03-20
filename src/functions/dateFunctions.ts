export function formatDatePtBr(date?: Date): string | undefined {
  if (!date) return undefined;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses começam do 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getMonthYearFromDueDate(dueDateString: string): string {
  const date = new Date(dueDateString);

  if (isNaN(date.getTime())) {
    console.error("Data de vencimento inválida fornecida:", dueDateString);
    return "";
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const monthName = monthNames[monthIndex];

  return `${monthName}${"\n"}${year}`;
}

export function getLocalDateString(dateTimeString: string): string {
  return dateTimeString.split('T')[0];
}

export function convertToDateObject(localDateString?: string | undefined): Date | undefined {
  if (!localDateString) {
    return undefined
  }
  const [year, month, day] = localDateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}