export function createNavigationHistory() {
  const previousByKey = new Map<string, string | null>();
  let currentKey: string | null = null;
  return {
    visit(key?: string) {
      if (!key) return;
      if (!previousByKey.has(key)) previousByKey.set(key, currentKey);
      currentKey = key;
    },
    hasPrevious(key?: string) {
      return !!key && !!previousByKey.get(key);
    },
  };
}

export const blogNavigationHistory = createNavigationHistory();
