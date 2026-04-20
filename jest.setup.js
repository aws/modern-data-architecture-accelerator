/**
 * Global Jest setup — prevents Docker/pip builds during tests.
 *
 * Mocks command-exists so MdaaPythonCodeAsset never detects docker/finch,
 * and stubs Code.fromDockerBuild / Code.fromCustomCommand so neither the
 * Docker path nor the pip fallback triggers a real build.
 *
 * Reference from any jest.config.js:
 *   setupFiles: ['<relative-path>/jest.setup.js']
 */

jest.mock('command-exists', () => ({
  sync: jest.fn().mockReturnValue(false),
}));

jest.mock('aws-cdk-lib/aws-lambda', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda');
  const mockCode = {
    bind: jest.fn().mockReturnValue({
      s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' },
    }),
    bindToResource: jest.fn(),
  };
  const OriginalCode = actual.Code;
  const MockedCode = Object.create(OriginalCode);
  MockedCode.fromDockerBuild = jest.fn().mockReturnValue(mockCode);
  MockedCode.fromCustomCommand = jest.fn().mockReturnValue(mockCode);
  return {
    ...actual,
    Code: MockedCode,
  };
});
