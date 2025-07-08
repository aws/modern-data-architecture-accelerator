import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MdaaInstaller from '../lib/mdaa-installer-stack';

/**
 * Test utilities for MDAA Installer Stack testing
 */

export interface TestStackProps extends cdk.StackProps {
  stackName?: string;
}

/**
 * Creates a standard test stack with common configuration
 */
export function createTestStack(props?: TestStackProps): {
  app: cdk.App;
  stack: MdaaInstaller.MdaaInstallerStack;
  template: Template;
} {
  const app = new cdk.App();
  const stackName = props?.stackName || 'TestMdaaInstallerStack';

  const stack = new MdaaInstaller.MdaaInstallerStack(app, stackName, {
    env: {
      account: 'xxxxxxxxxx',
      region: 'us-east-1',
    },
    ...props,
  });

  const template = Template.fromStack(stack);

  return { app, stack, template };
}

/**
 * Creates a test stack with custom environment
 */
export function createTestStackWithEnv(
  account: string,
  region: string,
  stackName?: string,
): {
  app: cdk.App;
  stack: MdaaInstaller.MdaaInstallerStack;
  template: Template;
} {
  return createTestStack({
    stackName: stackName || 'CustomEnvTestStack',
    env: { account, region },
  });
}

/**
 * Extracts resources of a specific type from a template
 */
export function getResourcesByType(template: Template, resourceType: string): Record<string, any> {
  return template.findResources(resourceType);
}

/**
 * Gets all resource types present in the template
 */
export function getResourceTypes(template: Template): string[] {
  const templateJson = template.toJSON();
  const resourceTypes = new Set<string>();

  Object.values(templateJson.Resources || {}).forEach((resource: any) => {
    resourceTypes.add(resource.Type);
  });

  return Array.from(resourceTypes).sort();
}

/**
 * Extracts security-related configurations from the template
 */
export function extractSecurityConfigurations(template: Template): {
  s3Encryption: any[];
  kmsKeyRotation: any[];
  publicAccessBlocks: any[];
  sslPolicies: any[];
} {
  const templateJson = template.toJSON();
  const securityConfigs = {
    s3Encryption: [],
    kmsKeyRotation: [],
    publicAccessBlocks: [],
    sslPolicies: [],
  } as any;

  Object.values(templateJson.Resources).forEach((resource: any) => {
    if (resource.Type === 'AWS::S3::Bucket') {
      if (resource.Properties.BucketEncryption) {
        securityConfigs.s3Encryption.push(resource.Properties.BucketEncryption);
      }
      if (resource.Properties.PublicAccessBlockConfiguration) {
        securityConfigs.publicAccessBlocks.push(resource.Properties.PublicAccessBlockConfiguration);
      }
    }
    if (resource.Type === 'AWS::KMS::Key' && resource.Properties.EnableKeyRotation) {
      securityConfigs.kmsKeyRotation.push(resource.Properties.EnableKeyRotation);
    }
    if (resource.Type === 'AWS::S3::BucketPolicy') {
      securityConfigs.sslPolicies.push(resource.Properties.PolicyDocument);
    }
  });

  return securityConfigs;
}

/**
 * Extracts parameter information from the template
 */
export function extractParameterInfo(template: Template): {
  parameterNames: string[];
  requiredParameters: string[];
  parametersWithDefaults: string[];
  parameterTypes: Record<string, string>;
} {
  const templateJson = template.toJSON();
  const parameters = templateJson.Parameters || {};

  const parameterNames = Object.keys(parameters);
  const requiredParameters: string[] = [];
  const parametersWithDefaults: string[] = [];
  const parameterTypes: Record<string, string> = {};

  Object.entries(parameters).forEach(([name, param]: [string, any]) => {
    parameterTypes[name] = param.Type;

    if (param.Default !== undefined) {
      parametersWithDefaults.push(name);
    } else {
      requiredParameters.push(name);
    }
  });

  return {
    parameterNames: parameterNames.sort(),
    requiredParameters: requiredParameters.sort(),
    parametersWithDefaults: parametersWithDefaults.sort(),
    parameterTypes,
  };
}

/**
 * Extracts conditional resources from the template
 */
export function extractConditionalResources(template: Template): Record<
  string,
  {
    type: string;
    condition: string;
  }
> {
  const templateJson = template.toJSON();
  const conditionalResources: Record<string, { type: string; condition: string }> = {};

  Object.entries(templateJson.Resources || {}).forEach(([resourceId, resource]: [string, any]) => {
    if (resource.Condition) {
      conditionalResources[resourceId] = {
        type: resource.Type,
        condition: resource.Condition,
      };
    }
  });

  return conditionalResources;
}

/**
 * Validates that all S3 buckets have proper security configurations
 */
export function validateS3Security(template: Template): {
  hasEncryption: boolean;
  hasPublicAccessBlock: boolean;
  hasSSLEnforcement: boolean;
  bucketCount: number;
} {
  const s3Buckets = getResourcesByType(template, 'AWS::S3::Bucket');
  const s3Policies = getResourcesByType(template, 'AWS::S3::BucketPolicy');

  const bucketCount = Object.keys(s3Buckets).length;
  let hasEncryption = true;
  let hasPublicAccessBlock = true;

  Object.values(s3Buckets).forEach((bucket: any) => {
    if (!bucket.Properties.BucketEncryption) {
      hasEncryption = false;
    }
    if (!bucket.Properties.PublicAccessBlockConfiguration) {
      hasPublicAccessBlock = false;
    }
  });

  const hasSSLEnforcement = Object.keys(s3Policies).length > 0;

  return {
    hasEncryption,
    hasPublicAccessBlock,
    hasSSLEnforcement,
    bucketCount,
  };
}

/**
 * Common test constants
 */
export const TEST_CONSTANTS = {
  DEFAULT_ACCOUNT: 'yyyyyyyyy',
  DEFAULT_REGION: 'us-east-1',
  ALTERNATIVE_ACCOUNT: 'xxxxxxxx',
  ALTERNATIVE_REGION: 'us-west-2',
  REPOSITORY_SOURCES: {
    GITHUB: 'github',
    S3: 's3',
  },
} as const;

/**
 * Common assertions for security best practices
 */
export const SECURITY_ASSERTIONS = {
  S3_ENCRYPTION_REQUIRED: 'All S3 buckets must have encryption enabled',
  PUBLIC_ACCESS_BLOCKED: 'All S3 buckets must block public access',
  SSL_ENFORCED: 'All S3 buckets must enforce SSL',
  KMS_KEY_ROTATION: 'KMS keys must have rotation enabled',
  IAM_LEAST_PRIVILEGE: 'IAM roles should follow least privilege principle',
} as const;
