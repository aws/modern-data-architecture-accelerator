/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import {
  buildLambdaToolSchema,
  buildSchemaDefinition,
  deriveGatewayTargetName,
  GatewayTargetCredentialProviderType,
  GatewayTargetLambdaProperty,
  GatewayTargetProps,
  GatewayTargetSchemaDefinitionProperty,
  MAX_TOOL_SCHEMA_DEPTH,
  resolveTargetCredentialProviderType,
  validateLambdaToolSource,
  validateTargetConfiguration,
} from '../lib';

// Input reference to an external Lambda — uses the mdaa-testing placeholder partition/region/account
// (test-partition / test-region / 111111111111) per the testing standard for region-bearing values.
const LAMBDA_ARN = 'arn:test-partition:lambda:test-region:111111111111:function:my-tool';
const inlineToolSchema = {
  inlinePayload: [{ name: 'tool', description: 'a tool', inputSchema: { type: 'object' } }],
};

// A GatewayTargetProps wrapping a Lambda tool source (the current supported target type).
function lambdaTarget(overrides: Partial<GatewayTargetProps> = {}): GatewayTargetProps {
  return {
    targetConfiguration: { lambda: { lambdaArn: LAMBDA_ARN, toolSchema: inlineToolSchema } },
    ...overrides,
  };
}

describe('deriveGatewayTargetName', () => {
  test('applies the MDAA prefix and sanitizes to the service name pattern', () => {
    const testApp = new MdaaTestApp();
    const name = deriveGatewayTargetName(testApp.naming, 'weather');
    expect(name).toContain('weather');
    expect(name).toMatch(/^([0-9a-zA-Z][-]?){1,50}$/);
    expect(name).not.toContain('_');
  });

  test('maps keys differing only by separator to the same derived name (collision source)', () => {
    // Underscore and hyphen both sanitize to a hyphen, so distinct keys can collapse to one name —
    // the collision the L3 guards against.
    const testApp = new MdaaTestApp();
    expect(deriveGatewayTargetName(testApp.naming, 'my_tool')).toBe(deriveGatewayTargetName(testApp.naming, 'my-tool'));
  });

  test('keeps keys distinct when they differ only past the truncation cap', () => {
    // The naming service truncates long names but appends a hash of the FULL (pre-truncation) name,
    // so two keys that are identical up to the cap and differ only afterward still derive DISTINCT
    // target names. This guards the uniqueness contract against a regression that truncated without
    // the full-name hash (which would silently let post-cap-only differences collide at deploy).
    const testApp = new MdaaTestApp();
    const common = 'a'.repeat(120);
    const nameOne = deriveGatewayTargetName(testApp.naming, `${common}-one`);
    const nameTwo = deriveGatewayTargetName(testApp.naming, `${common}-two`);
    // Capped to the service target-name limit (50), which the create API under-documents as 100.
    expect(nameOne.length).toBeLessThanOrEqual(50);
    expect(nameTwo.length).toBeLessThanOrEqual(50);
    expect(nameOne).not.toBe(nameTwo);
  });
});

describe('validateTargetConfiguration', () => {
  test('accepts a valid inline-schema Lambda target', () => {
    expect(() => validateTargetConfiguration('weather', lambdaTarget())).not.toThrow();
  });

  test('throws when targetConfiguration is missing', () => {
    expect(() => validateTargetConfiguration('weather', {} as unknown as GatewayTargetProps)).toThrow(
      /Gateway target "weather" must define a targetConfiguration/,
    );
  });

  test('throws when no target type is set (received 0)', () => {
    expect(() => validateTargetConfiguration('weather', { targetConfiguration: {} })).toThrow(
      /must set exactly one target type.*received 0/,
    );
  });

  test('throws when more than one target type is set', () => {
    expect(() =>
      validateTargetConfiguration('weather', {
        targetConfiguration: {
          lambda: { lambdaArn: LAMBDA_ARN, toolSchema: inlineToolSchema },
          mcpServer: { endpoint: 'https://example.com/mcp' },
        },
      }),
    ).toThrow(/must set exactly one target type.*received 2 \(lambda, mcpServer\)/);
  });

  test('throws on a declared-but-unsupported target type, naming the type', () => {
    expect(() =>
      validateTargetConfiguration('weather', {
        targetConfiguration: { mcpServer: { endpoint: 'https://example.com/mcp' } },
      }),
    ).toThrow(/uses target type "mcpServer", which is not yet supported; only lambda is currently supported/);
  });
});

describe('validateLambdaToolSource', () => {
  test('accepts a valid inline-schema Lambda tool source', () => {
    expect(() =>
      validateLambdaToolSource('weather', { lambdaArn: LAMBDA_ARN, toolSchema: inlineToolSchema }),
    ).not.toThrow();
  });

  test('throws when lambdaArn is missing, naming the target', () => {
    expect(() =>
      validateLambdaToolSource('weather', { toolSchema: inlineToolSchema } as GatewayTargetLambdaProperty),
    ).toThrow(/Gateway target "weather" must define a lambda tool source with a lambdaArn/);
  });

  test('throws when toolSchema is missing, naming the target', () => {
    expect(() => validateLambdaToolSource('weather', { lambdaArn: LAMBDA_ARN } as GatewayTargetLambdaProperty)).toThrow(
      /Gateway target "weather" is missing toolSchema/,
    );
  });

  test('throws when both inlinePayload and s3 are set', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { ...inlineToolSchema, s3: { uri: 's3://b/k.json' } },
      }),
    ).toThrow(/exactly one of inlinePayload or s3 \(received both\)/);
  });

  test('throws when neither inlinePayload nor s3 is set', () => {
    expect(() => validateLambdaToolSource('weather', { lambdaArn: LAMBDA_ARN, toolSchema: {} })).toThrow(
      /exactly one of inlinePayload or s3 \(received neither\)/,
    );
  });

  test('throws on an empty inlinePayload', () => {
    expect(() =>
      validateLambdaToolSource('weather', { lambdaArn: LAMBDA_ARN, toolSchema: { inlinePayload: [] } }),
    ).toThrow(/inlinePayload must contain at least one tool/);
  });

  test('throws on an s3 schema without a uri', () => {
    expect(() =>
      validateLambdaToolSource('weather', { lambdaArn: LAMBDA_ARN, toolSchema: { s3: {} as { uri: string } } }),
    ).toThrow(/toolSchema.s3 must set a uri/);
  });

  test('throws on an inline tool with an empty name, naming the target', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { inlinePayload: [{ name: '', description: 'a tool', inputSchema: { type: 'object' } }] },
      }),
    ).toThrow(/Gateway target "weather" toolSchema.inlinePayload\[0\] must set a non-empty name/);
  });

  test('throws on an inline tool with an empty description, naming the tool', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { inlinePayload: [{ name: 'getWeather', description: '', inputSchema: { type: 'object' } }] },
      }),
    ).toThrow(/Gateway target "weather" tool "getWeather" must set a non-empty description/);
  });

  test('throws on an explicit non-12-digit s3 bucketOwnerAccountId, quoting the value', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '12345' } },
      }),
    ).toThrow(/bucketOwnerAccountId "12345" must be a 12-digit AWS account id/);
  });

  test('accepts an explicit 12-digit s3 bucketOwnerAccountId', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '111111111111' } },
      }),
    ).not.toThrow();
  });

  test('treats an empty-string s3 bucketOwnerAccountId as unset (defaulted downstream, not rejected)', () => {
    expect(() =>
      validateLambdaToolSource('weather', {
        lambdaArn: LAMBDA_ARN,
        toolSchema: { s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '' } },
      }),
    ).not.toThrow();
  });
});

describe('resolveTargetCredentialProviderType', () => {
  test('defaults to GATEWAY_IAM_ROLE when no credential provider is supplied', () => {
    expect(resolveTargetCredentialProviderType('weather', lambdaTarget())).toBe('GATEWAY_IAM_ROLE');
  });

  test('accepts an explicit GATEWAY_IAM_ROLE', () => {
    expect(
      resolveTargetCredentialProviderType(
        'weather',
        lambdaTarget({ credentialProvider: { type: GatewayTargetCredentialProviderType.GATEWAY_IAM_ROLE } }),
      ),
    ).toBe('GATEWAY_IAM_ROLE');
  });

  test('throws on a known-but-unsupported type (OAUTH) as not yet supported', () => {
    expect(() =>
      resolveTargetCredentialProviderType(
        'weather',
        lambdaTarget({ credentialProvider: { type: GatewayTargetCredentialProviderType.OAUTH } }),
      ),
    ).toThrow(/uses credentialProvider type "OAUTH", which is not yet supported; only GATEWAY_IAM_ROLE/);
  });

  test('throws on an invalid (unknown) credential provider type', () => {
    expect(() =>
      resolveTargetCredentialProviderType('weather', {
        ...lambdaTarget(),
        // Deliberately invalid value — cast through unknown.
        credentialProvider: { type: 'BOGUS' as unknown as GatewayTargetCredentialProviderType },
      }),
    ).toThrow(/uses invalid credentialProvider type "BOGUS"; must be one of/);
  });
});

describe('buildLambdaToolSchema', () => {
  test('builds an inline tool schema', () => {
    const result = buildLambdaToolSchema(
      {
        inlinePayload: [
          {
            name: 'getWeather',
            description: 'Returns the weather',
            inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
          },
        ],
      },
      '111111111111',
    );
    expect(result.inlinePayload).toHaveLength(1);
    const tool = (result.inlinePayload as CfnInlineTool[])[0];
    expect(tool.name).toBe('getWeather');
    expect(tool.inputSchema).toEqual({
      type: 'object',
      description: undefined,
      properties: {
        city: { type: 'string', description: undefined, properties: undefined, required: undefined, items: undefined },
      },
      required: ['city'],
      items: undefined,
    });
  });

  test('builds an inline tool schema with an outputSchema', () => {
    const result = buildLambdaToolSchema(
      {
        inlinePayload: [
          {
            name: 'getWeather',
            description: 'Returns the weather',
            inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
            outputSchema: { type: 'object', properties: { tempC: { type: 'number' } }, required: ['tempC'] },
          },
        ],
      },
      '111111111111',
    );
    const tool = (result.inlinePayload as CfnInlineTool[])[0];
    expect(tool.outputSchema).toEqual({
      type: 'object',
      description: undefined,
      properties: {
        tempC: { type: 'number', description: undefined, properties: undefined, required: undefined, items: undefined },
      },
      required: ['tempC'],
      items: undefined,
    });
  });

  test('omits outputSchema when the tool does not define one', () => {
    const result = buildLambdaToolSchema(
      { inlinePayload: [{ name: 'tool', description: 'a tool', inputSchema: { type: 'object' } }] },
      '111111111111',
    );
    expect((result.inlinePayload as CfnInlineTool[])[0].outputSchema).toBeUndefined();
  });

  test('builds an S3 tool schema, preserving an explicit bucketOwnerAccountId over the default', () => {
    expect(
      buildLambdaToolSchema({ s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '111111111111' } }, '999988887777'),
    ).toEqual({ s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '111111111111' } });
  });

  test('defaults S3 bucketOwnerAccountId to the required deploying account when omitted', () => {
    expect(buildLambdaToolSchema({ s3: { uri: 's3://b/k.json' } }, '111111111111')).toEqual({
      s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '111111111111' },
    });
  });

  test('an empty-string bucketOwnerAccountId does not escape the default (deploying account wins)', () => {
    // `""` is a plausible YAML accident or a defensive `?? ''` upstream; it must NOT render
    // BucketOwnerAccountId: "" and defeat the confused-deputy protection — the deploying account wins.
    expect(buildLambdaToolSchema({ s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '' } }, '111111111111')).toEqual({
      s3: { uri: 's3://b/k.json', bucketOwnerAccountId: '111111111111' },
    });
  });

  test('throws when the deploying account is empty (the enforced fallback would be empty)', () => {
    expect(() => buildLambdaToolSchema({ s3: { uri: 's3://b/k.json' } }, '')).toThrow(
      /requires a non-empty deployingAccount/,
    );
  });
});

describe('buildSchemaDefinition', () => {
  test('recurses into array items', () => {
    const result = buildSchemaDefinition({ type: 'array', items: { type: 'string' } });
    expect(result.type).toBe('array');
    expect((result.items as { type: string }).type).toBe('string');
  });

  test('recurses into the object properties map and passes through node descriptions', () => {
    // Directly exercises the properties-map recursion and the node-level description passthrough
    // (covered only indirectly via buildLambdaToolSchema otherwise).
    const result = buildSchemaDefinition({
      type: 'object',
      description: 'the root node',
      properties: {
        city: { type: 'string', description: 'the city name' },
      },
      required: ['city'],
    });
    expect(result.description).toBe('the root node');
    expect(result.required).toEqual(['city']);
    const properties = result.properties as { [name: string]: { type: string; description?: string } };
    expect(properties.city).toEqual({
      type: 'string',
      description: 'the city name',
      properties: undefined,
      required: undefined,
      items: undefined,
    });
  });

  test('throws a clear error (not a RangeError) when nesting exceeds the max depth', () => {
    // Build a schema nested one level deeper than MAX_TOOL_SCHEMA_DEPTH via array items.
    let schema: GatewayTargetSchemaDefinitionProperty = { type: 'string' };
    for (let i = 0; i < MAX_TOOL_SCHEMA_DEPTH; i++) {
      schema = { type: 'array', items: schema };
    }
    expect(() => buildSchemaDefinition(schema)).toThrow(
      new RegExp(`nesting exceeds the maximum supported depth of ${MAX_TOOL_SCHEMA_DEPTH}`),
    );
  });

  test('accepts a schema nested exactly at the max depth', () => {
    // MAX_TOOL_SCHEMA_DEPTH total levels: the root plus (MAX - 1) nested items.
    let schema: GatewayTargetSchemaDefinitionProperty = { type: 'string' };
    for (let i = 0; i < MAX_TOOL_SCHEMA_DEPTH - 1; i++) {
      schema = { type: 'array', items: schema };
    }
    expect(() => buildSchemaDefinition(schema)).not.toThrow();
  });
});

interface CfnInlineTool {
  name: string;
  inputSchema: unknown;
  outputSchema?: unknown;
}
