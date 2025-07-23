const ACCOUNT_NAME_PATTERN = /^(?!D-|d-)([\da-zA-Z]+)(-*[\da-zA-Z])*/;

export class InvalidAccountNameError implements Error {
  constructor(accountName: string) {
    this.message = `Account name does not conform to pattern: ${ACCOUNT_NAME_PATTERN}: ${accountName}`;
    this.name = 'InvalidAccountNameError';
  }

  message: string;
  name: string;
}

export function sanitizeAccountName(accountName: string): string {
  const originalAccountName = accountName;
  // Remove leading "D-" or "d-"
  if (accountName.startsWith('D-') || accountName.startsWith('d-')) {
    accountName = accountName.slice(2);
  }

  // Remove all characters except alphanumeric and hyphens
  accountName = accountName.replace(/[^a-zA-Z0-9-]/g, '');

  // Remove leading hyphens if any (to ensure starting with alphanumeric)
  accountName = accountName.replace(/^-+/, '');

  // Remove trailing hyphens if any
  // This regex is safe: no nested or ambiguous quantifiers.
  accountName = accountName.replace(/-+$/, ''); // NOSONAR

  // Replace multiple consecutive hyphens with a single hyphen
  accountName = accountName.replace(/-{2,}/g, '-');

  if (!ACCOUNT_NAME_PATTERN.test(accountName)) {
    throw new InvalidAccountNameError(accountName);
  }
  if (originalAccountName !== accountName) {
    console.warn(`Account name was sanitized from: ${originalAccountName}`);
  }

  return accountName;
}
