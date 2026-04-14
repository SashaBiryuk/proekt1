/** ISO "YYYY-MM-DD" → "ДД.ММ.ГГГГ" */
export function formatDateDMY(iso: string | undefined | null): string {
  if (!iso) return '';
  const parts = iso.split('T')[0].split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** "ДД.ММ.ГГГГ" → ISO "YYYY-MM-DD" */
export function parseDateDMY(dmy: string): string {
  const parts = dmy.split('.');
  if (parts.length !== 3) return dmy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Date object → ISO "YYYY-MM-DD" */
export function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO "YYYY-MM-DD" → Date object (midnight local) */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Длинный формат для отображения: "1 июня 2025 г." */
export function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = isoToDate(iso.split('T')[0]);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
