import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { MdaaLogGroupProps } from '../lib';
import { updateProps } from '../lib/loggroup-utils';
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';

describe('updateProps', () => {
  // Mock IKey for encryptionKey
  const mockKey = {
    keyId: 'mock-key-id',
    keyArn: 'arn:aws:kms:us-east-1:123456789012:key/mock-key-id',
  } as IKey;

  // Mock IMdaaResourceNaming for naming
  const mockNaming = {
    resourceName: (name: string) => `${name ?? 'default'}-mocked`,
    withResourceType: function () {
      return this;
    },
  } as unknown as IMdaaResourceNaming;

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

  test('invokes withResourceType with CLOUDWATCH_LOG_GROUP', () => {
    const withResourceTypeSpy = jest.fn();
    const spyNaming = {
      resourceName: (name: string) => `${name ?? 'default'}-mocked`,
      withResourceType: function (this: IMdaaResourceNaming, resourceType: MdaaResourceType) {
        withResourceTypeSpy(resourceType);
        return this;
      },
    } as unknown as IMdaaResourceNaming;
    updateProps({
      ...baseProps,
      naming: spyNaming,
      logGroupName: 'app-logs',
    } as MdaaLogGroupProps);
    expect(withResourceTypeSpy).toHaveBeenCalledWith(MdaaResourceType.CLOUDWATCH_LOG_GROUP);
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

  test('appends the given name unchanged when verbatimLogGroupName is set', () => {
    const props = {
      ...baseProps,
      logGroupName: 'test-org-test-env-test-domain-test-module-app-logs',
      verbatimLogGroupName: true,
    } as MdaaLogGroupProps;
    const result = updateProps(props);
    expect(result.logGroupName).toBe('/my/logs/test-org-test-env-test-domain-test-module-app-logs');
    expect(result.removalPolicy).toBe(RemovalPolicy.RETAIN);
  });

  test('throws when verbatimLogGroupName is set without a logGroupName', () => {
    const props = {
      ...baseProps,
      logGroupName: undefined,
      verbatimLogGroupName: true,
    } as MdaaLogGroupProps;
    expect(() => updateProps(props)).toThrow(/"verbatimLogGroupName" requires "logGroupName"/);
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
