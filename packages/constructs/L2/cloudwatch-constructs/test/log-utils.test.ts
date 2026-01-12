import { cleanQueryString, ensureLimitClause } from '../lib/log-utils';

describe('cleanQueryString', () => {
  test('strips leading whitespace from each line', () => {
    const input = '  fields @timestamp, @message\n  | filter @message like /ERROR/\n  | sort @timestamp desc';
    const expected = 'fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc';
    expect(cleanQueryString(input)).toBe(expected);
  });

  test('handles mixed indentation', () => {
    const input = 'fields @timestamp\n    | filter level = "error"\n  | sort @timestamp';
    const expected = 'fields @timestamp\n| filter level = "error"\n| sort @timestamp';
    expect(cleanQueryString(input)).toBe(expected);
  });

  test('preserves lines without leading whitespace', () => {
    const input = 'fields @timestamp\n| filter @message\n| sort @timestamp';
    expect(cleanQueryString(input)).toBe(input);
  });

  test('handles empty string', () => {
    expect(cleanQueryString('')).toBe('');
  });

  test('handles single line with whitespace', () => {
    const input = '   fields @timestamp, @message';
    const expected = 'fields @timestamp, @message';
    expect(cleanQueryString(input)).toBe(expected);
  });

  test('preserves trailing whitespace on lines', () => {
    const input = '  fields @timestamp  \n  | filter @message  ';
    const expected = 'fields @timestamp  \n| filter @message  ';
    expect(cleanQueryString(input)).toBe(expected);
  });
});

describe('ensureLimitClause', () => {
  test('appends limit clause when missing', () => {
    const input = 'fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc';
    const expected =
      'fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 10000';
    expect(ensureLimitClause(input)).toBe(expected);
  });

  test('preserves existing limit clause with space', () => {
    const input = 'fields @timestamp\n| filter @message\n| limit 100';
    expect(ensureLimitClause(input)).toBe(input);
  });

  test('preserves existing limit clause without space', () => {
    const input = 'fields @timestamp\n| filter @message\n|limit 100';
    expect(ensureLimitClause(input)).toBe(input);
  });

  test('handles limit clause with different casing', () => {
    const input = 'fields @timestamp\n| LIMIT 500';
    expect(ensureLimitClause(input)).toBe(input);
  });

  test('handles limit clause with mixed casing', () => {
    const input = 'fields @timestamp\n| LiMiT 500';
    expect(ensureLimitClause(input)).toBe(input);
  });

  test('trims whitespace before checking', () => {
    const input = '  fields @timestamp\n| filter @message  ';
    const expected = 'fields @timestamp\n| filter @message\n| limit 10000';
    expect(ensureLimitClause(input)).toBe(expected);
  });

  test('handles empty string', () => {
    expect(ensureLimitClause('')).toBe('\n| limit 10000');
  });

  test('handles query with limit in middle of string', () => {
    const input = 'fields @timestamp\n| filter message like /limit/\n| sort @timestamp';
    const expected = 'fields @timestamp\n| filter message like /limit/\n| sort @timestamp\n| limit 10000';
    expect(ensureLimitClause(input)).toBe(expected);
  });
});
