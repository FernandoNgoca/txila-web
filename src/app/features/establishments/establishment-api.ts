export interface Establishment {
  id: number; name: string; type: string; neighbourhood: string | null; city: string;
  latitude: number | null; longitude: number | null; active: boolean; createdDate: string | null; updatedDate: string | null;
}

export const ESTABLISHMENT_TYPES: { value: string; label: string }[] = [
  { value: 'BAR', label: 'Bar' },
  { value: 'DISCOTECA', label: 'Discoteca' },
  { value: 'RESTAURANTE', label: 'Restaurante' },
  { value: 'LOUNGE', label: 'Lounge' },
  { value: 'BARRACA', label: 'Barraca' },
  { value: 'OUTRO', label: 'Outro' },
];

export function typeLabel(type: string): string {
  return ESTABLISHMENT_TYPES.find(t => t.value === type)?.label ?? type;
}
