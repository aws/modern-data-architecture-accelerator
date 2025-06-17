import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { updateProps } from '../lib/utils';
import { RemovalPolicy } from 'aws-cdk-lib';
import { MdaaLogGroupProps } from '../lib';

describe('updateProps', () => {
  // Mock IKey for encryptionKey
  const mockKey = {
    keyId: 'mock-key-id',
    keyArn: 'arn:aws:kms:us-east-1:123456789012:key/mock-key-id',
  } as IKey;

  // Mock IMdaaResourceNaming for naming
  const mockNaming = {
    resourceName: (name: string) => `${name ?? 'default'}-mocked`,
  };

  // Required props in MdaaLogGroupProps and MdaaConstructProps
  const baseProps = {
    encryptionKey: mockKey,
    naming: mockNaming,
    logGroupNamePathPrefix: '/my/logs/',
    retention: RetentionDays.ONE_MONTH,
  };

  test('constructs logGroupName with path prefix and given name using naming resourceName', () => {
    const props = {
      ...baseProps,
      logGroupName: 'app-logs',
    } as MdaaLogGroupProps;
    const result = updateProps(props);
    expect(result.logGroupName).toBe('/my/logs/app-logs-mocked');
    expect(result.removalPolicy).toBe(RemovalPolicy.RETAIN);
    expect(result.retention).toBe(RetentionDays.ONE_MONTH);
  });

  test('adds trailing slash if missing in path prefix and uses naming resourceName', () => {
    const props = {
      ...baseProps,
      logGroupNamePathPrefix: '/my/logs',
      logGroupName: 'app-logs',
      retention: RetentionDays.ONE_YEAR,
    } as MdaaLogGroupProps;
    const result = updateProps(props);
    expect(result.logGroupName).toBe('/my/logs/app-logs-mocked');
  });

  test('uses default log group name if not provided', () => {
    const props = {
      ...baseProps,
      logGroupName: undefined,
      retention: RetentionDays.TWO_YEARS,
    } as MdaaLogGroupProps;
    const result = updateProps(props);
    expect(result.logGroupName).toBe('/my/logs/default-mocked');
  });
});
