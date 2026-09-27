export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  return classes
    .flatMap(cls => {
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([, value]) => value)
          .map(([key]) => key);
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}