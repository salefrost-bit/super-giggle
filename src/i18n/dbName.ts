export function localizedName(
  row: { name: string; nameEn?: string | null },
  locale: string
): string {
  if (locale === 'en' && row.nameEn) return row.nameEn;
  return row.name;
}
