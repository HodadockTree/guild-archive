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
