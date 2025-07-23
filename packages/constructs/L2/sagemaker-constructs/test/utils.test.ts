import { InvalidNotebookNameError, MAX_NOTEBOOK_NAME_LENGTH, sanitizeNotebookName } from '../lib/utils';

describe('sanitizeNotebookName', () => {
  it('should return valid notebook name unchanged', () => {
    expect(sanitizeNotebookName('validNotebook123')).toBe('validNotebook123');
    expect(sanitizeNotebookName('test-notebook')).toBe('test-notebook');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeNotebookName('notebook@#$%')).toBe('notebook');
    expect(sanitizeNotebookName('test_notebook.name')).toBe('testnotebookname');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeNotebookName('-notebook-')).toBe('notebook');
    expect(sanitizeNotebookName('---test---')).toBe('test');
  });

  it('should replace multiple consecutive hyphens with single hyphen', () => {
    expect(sanitizeNotebookName('test--notebook')).toBe('test-notebook');
    expect(sanitizeNotebookName('a---b')).toBe('a-b');
  });

  it('should throw InvalidNotebookNameError for invalid regex result', () => {
    expect(() => sanitizeNotebookName('---')).toThrow(InvalidNotebookNameError);
    expect(() => sanitizeNotebookName('_')).toThrow(InvalidNotebookNameError);
  });

  it('should throw InvalidNotebookNameError for names exceeding max length', () => {
    const longName = 'a'.repeat(MAX_NOTEBOOK_NAME_LENGTH + 1);
    expect(() => sanitizeNotebookName(longName)).toThrow(InvalidNotebookNameError);
  });
});

describe('InvalidNotebookNameError', () => {
  it('should create error with correct message and name', () => {
    const error = new InvalidNotebookNameError('invalid', 'Test reason');
    expect(error.name).toBe('InvalidAccountNameError');
    expect(error.message).toBe('Test reason: invalid');
  });
});
