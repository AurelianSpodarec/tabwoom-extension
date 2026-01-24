export function mergeReorderWithAnchors(input: {
  baseOrder: string[];
  anchoredKeys: Set<string>;
  nextReorderValues: string[];
}): string[] {
  if (input.anchoredKeys.size === 0) return input.nextReorderValues;

  const expectedReorderCount = input.baseOrder.reduce((acc, k) => (input.anchoredKeys.has(k) ? acc : acc + 1), 0);
  if (expectedReorderCount !== input.nextReorderValues.length) return input.baseOrder;

  const out: string[] = [];
  let i = 0;

  for (const k of input.baseOrder) {
    if (input.anchoredKeys.has(k)) {
      out.push(k);
      continue;
    }

    out.push(input.nextReorderValues[i++]!);
  }

  return out;
}
