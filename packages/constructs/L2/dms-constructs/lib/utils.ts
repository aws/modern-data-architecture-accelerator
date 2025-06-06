export function fixAndValidate(input: string): string {
  const normalized = input.replace(/-+/g, '-');

  // Regex breakdown:
  // ^[A-Za-z]        - Starts with letter
  // [A-Za-z0-9-]*    - Contains only letters, numbers, and hyphens
  // [A-Za-z0-9]$     - Ends with letter/number (not hyphen)
  const validPattern = /^[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

  if (!validPattern.test(normalized)) {
    throw new Error('Invalid string format');
  }

  return normalized;
}
