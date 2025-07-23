import { InvalidAccountNameError, sanitizeAccountName } from '../lib/utils';

describe('sanitizeAccountName', () => {
  it('should return valid account name unchanged', () => {
    expect(sanitizeAccountName('validAccount123')).toBe('validAccount123');
    expect(sanitizeAccountName('test-account')).toBe('test-account');
  });

  it('should remove leading D- or d-', () => {
    expect(sanitizeAccountName('D-account')).toBe('account');
    expect(sanitizeAccountName('d-account')).toBe('account');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeAccountName('account@#$%')).toBe('account');
    expect(sanitizeAccountName('test_account.name')).toBe('testaccountname');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeAccountName('-account-')).toBe('account');
    expect(sanitizeAccountName('---test---')).toBe('test');
  });

  it('should replace multiple consecutive hyphens with single hyphen', () => {
    expect(sanitizeAccountName('test--account')).toBe('test-account');
    expect(sanitizeAccountName('a---b')).toBe('a-b');
  });

  it('should throw InvalidAccountNameError for invalid result', () => {
    expect(() => sanitizeAccountName('---')).toThrow(InvalidAccountNameError);
    expect(() => sanitizeAccountName('D-')).toThrow(InvalidAccountNameError);
  });
});

describe('InvalidAccountNameError', () => {
  it('should create error with correct message and name', () => {
    const error = new InvalidAccountNameError('invalid');
    expect(error.name).toBe('InvalidAccountNameError');
    expect(error.message).toContain('Account name does not conform to pattern');
    expect(error.message).toContain('invalid');
  });
});
