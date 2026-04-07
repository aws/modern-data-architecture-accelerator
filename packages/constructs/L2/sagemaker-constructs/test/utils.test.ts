import {
  InvalidNotebookNameError,
  MAX_NOTEBOOK_NAME_LENGTH,
  sanitizeNotebookName,
  serializeTaskPrice,
  validateNumberOfHumanWorkersPerDataObject,
  validateScheduleExpression,
  validateTaskAvailabilityLifetimeInSeconds,
  validateTaskTimeLimitInSeconds,
} from '../lib/utils';

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

describe('validateScheduleExpression', () => {
  it('accepts a valid cron expression', () => {
    expect(() => validateScheduleExpression('cron(0 * ? * * *)')).not.toThrow();
  });

  it('accepts a valid rate expression', () => {
    expect(() => validateScheduleExpression('rate(1 hour)')).not.toThrow();
  });

  it('throws for a plain string', () => {
    expect(() => validateScheduleExpression('every hour')).toThrow('schedule must be a valid cron');
  });

  it('throws for an empty string', () => {
    expect(() => validateScheduleExpression('')).toThrow('schedule must be a valid cron');
  });

  it('throws for malformed expression missing closing parenthesis', () => {
    expect(() => validateScheduleExpression('cron(0 * ? * * *')).toThrow('schedule must be a valid cron');
  });

  it('throws for unsupported prefix', () => {
    expect(() => validateScheduleExpression('interval(5 minutes)')).toThrow('schedule must be a valid cron');
  });
});

describe('validateNumberOfHumanWorkersPerDataObject', () => {
  it('accepts boundary values 1 and 9', () => {
    expect(() => validateNumberOfHumanWorkersPerDataObject(1)).not.toThrow();
    expect(() => validateNumberOfHumanWorkersPerDataObject(9)).not.toThrow();
  });

  it('throws for value below minimum (0)', () => {
    expect(() => validateNumberOfHumanWorkersPerDataObject(0)).toThrow('numberOfHumanWorkersPerDataObject');
  });

  it('throws for value above maximum (10)', () => {
    expect(() => validateNumberOfHumanWorkersPerDataObject(10)).toThrow('numberOfHumanWorkersPerDataObject');
  });

  it('throws for non-integer value', () => {
    expect(() => validateNumberOfHumanWorkersPerDataObject(1.5)).toThrow('numberOfHumanWorkersPerDataObject');
  });
});

describe('validateTaskTimeLimitInSeconds', () => {
  it('accepts boundary values 30 and 28800', () => {
    expect(() => validateTaskTimeLimitInSeconds(30)).not.toThrow();
    expect(() => validateTaskTimeLimitInSeconds(28800)).not.toThrow();
  });

  it('throws for value below minimum (29)', () => {
    expect(() => validateTaskTimeLimitInSeconds(29)).toThrow('taskTimeLimitInSeconds');
  });

  it('throws for value above maximum (28801)', () => {
    expect(() => validateTaskTimeLimitInSeconds(28801)).toThrow('taskTimeLimitInSeconds');
  });

  it('throws for non-integer value', () => {
    expect(() => validateTaskTimeLimitInSeconds(30.5)).toThrow('taskTimeLimitInSeconds');
  });
});

describe('validateTaskAvailabilityLifetimeInSeconds', () => {
  it('accepts boundary values 60 and 864000', () => {
    expect(() => validateTaskAvailabilityLifetimeInSeconds(60)).not.toThrow();
    expect(() => validateTaskAvailabilityLifetimeInSeconds(864000)).not.toThrow();
  });

  it('throws for value below minimum (59)', () => {
    expect(() => validateTaskAvailabilityLifetimeInSeconds(59)).toThrow('taskAvailabilityLifetimeInSeconds');
  });

  it('throws for value above maximum (864001)', () => {
    expect(() => validateTaskAvailabilityLifetimeInSeconds(864001)).toThrow('taskAvailabilityLifetimeInSeconds');
  });

  it('throws for non-integer value', () => {
    expect(() => validateTaskAvailabilityLifetimeInSeconds(60.5)).toThrow('taskAvailabilityLifetimeInSeconds');
  });
});

describe('serializeTaskPrice', () => {
  it('correctly decomposes a single-unit price', () => {
    expect(serializeTaskPrice(6)).toBe('{"AmountInUsd":{"Dollars":0,"Cents":0,"TenthFractionsOfACent":6}}');
  });

  it('correctly decomposes a multi-unit price', () => {
    // 1234: Dollars=1, Cents=23, TenthFractionsOfACent=4
    expect(serializeTaskPrice(1234)).toBe('{"AmountInUsd":{"Dollars":1,"Cents":23,"TenthFractionsOfACent":4}}');
  });

  it('accepts minimum valid price (1)', () => {
    expect(() => serializeTaskPrice(1)).not.toThrow();
  });

  it('throws for zero', () => {
    expect(() => serializeTaskPrice(0)).toThrow('taskPrice must be a positive integer');
  });

  it('throws for negative value', () => {
    expect(() => serializeTaskPrice(-1)).toThrow('taskPrice must be a positive integer');
  });

  it('throws for non-integer value', () => {
    expect(() => serializeTaskPrice(1.5)).toThrow('taskPrice must be a positive integer');
  });
});

describe('InvalidNotebookNameError', () => {
  it('should create error with correct message and name', () => {
    const error = new InvalidNotebookNameError('invalid', 'Test reason');
    expect(error.name).toBe('InvalidAccountNameError');
    expect(error.message).toBe('Test reason: invalid');
  });
});
