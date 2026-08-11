export function pathParamNames(path: string): string[] {
  const names: string[] = [];
  for (const match of path.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) {
    if (match[1]) names.push(match[1]);
  }
  return names;
}
