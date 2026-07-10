export type ProjectFileFlightFields = {
  name?: string;
  size?: number;
  mediaType?: string;
  lastModified?: number;
};

function encodeTextField(value: string | undefined): string {
  return typeof value === 'string' ? `s${value.length}:${value}` : '-';
}

function encodeNumberField(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `n:${value.toString()}` : '-';
}

export function buildProjectFileFlightFingerprint(fields: ProjectFileFlightFields): string | null {
  const hasValue =
    typeof fields.name === 'string' ||
    (typeof fields.size === 'number' && Number.isFinite(fields.size)) ||
    typeof fields.mediaType === 'string' ||
    (typeof fields.lastModified === 'number' && Number.isFinite(fields.lastModified));
  if (!hasValue) return null;
  return [
    encodeTextField(fields.name),
    encodeNumberField(fields.size),
    encodeTextField(fields.mediaType),
    encodeNumberField(fields.lastModified),
  ].join('|');
}
