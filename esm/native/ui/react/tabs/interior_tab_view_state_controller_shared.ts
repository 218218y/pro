export function patchInteriorSketchShelfDepthMap(
  prev: Record<string, number | ''>,
  variant: string,
  depth: number | ''
): Record<string, number | ''> {
  if (prev[variant] === depth) return prev;
  return { ...prev, [variant]: depth };
}

export function patchInteriorSketchShelfDepthDraftMap(
  prev: Record<string, string>,
  variant: string,
  depthDraft: string
): Record<string, string> {
  if ((prev[variant] ?? '') === depthDraft) return prev;
  return { ...prev, [variant]: depthDraft };
}
