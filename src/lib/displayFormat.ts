export function formatMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  return match ? `${match[1]}년 ${Number(match[2])}월` : month;
}

export function formatMonthDay(date: string) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[1]}/${match[2]}` : date;
}

export function formatFullDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match
    ? `${match[1]}. ${Number(match[2])}. ${Number(match[3])}.`
    : date;
}

export function formatDateRange(startDate: string, endDate?: string) {
  if (!endDate || endDate === startDate) {
    return formatFullDate(startDate);
  }

  const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  const endMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate);

  if (!startMatch || !endMatch) {
    return `${formatFullDate(startDate)} – ${formatFullDate(endDate)}`;
  }

  const startLabel = formatFullDate(startDate);
  const endLabel =
    startMatch[1] === endMatch[1]
      ? `${Number(endMatch[2])}. ${Number(endMatch[3])}.`
      : formatFullDate(endDate);

  return `${startLabel} – ${endLabel}`;
}
