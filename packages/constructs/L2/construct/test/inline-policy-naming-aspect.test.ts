/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Aspects, Lazy, Stack } from 'aws-cdk-lib';
import { CfnRole, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { IMdaaResourceNaming, MdaaResourceType, MdaaResourceNamingConfig } from '@aws-mdaa/naming';
import { InlinePolicyNamingAspect } from '../lib';
import { Node } from 'constructs';

// NOTE ON CDK NAG: The L2 standard asks construct tests to call
// MdaaTestApp.checkCdkNagCompliance(). It is intentionally not used here because
// InlinePolicyNamingAspect is a naming-only CDK Aspect: it creates no resources
// and only rewrites the PolicyName of pre-existing AWS::IAM::Policy resources.
// The Role/Policy constructs in these tests are fixtures used to drive the aspect,
// not the code under test, so Nag validation would only assess the fixtures and
// adds no coverage for the aspect's behavior.

function createMockNaming(prefix: string): IMdaaResourceNaming {
  const mockProps: MdaaResourceNamingConfig = {
    cdkNode: undefined as unknown as Node,
    org: 'test-org',
    env: 'dev',
    domain: 'test-domain',
    moduleName: 'test-module',
  };
  const naming: IMdaaResourceNaming = {
    props: mockProps,
    resourceName: (suffix?: string, maxLength?: number) => {
      const name = `${prefix}-${suffix ?? 'default'}`;
      return maxLength && name.length > maxLength ? name.substring(0, maxLength) : name;
    },
    withResourceType: function (_resourceType: MdaaResourceType) {
      return this;
    },
    withOrg: function () {
      return this;
    },
    withEnv: function () {
      return this;
    },
    withDomain: function () {
      return this;
    },
    withModuleName: function () {
      return this;
    },
    withSuffix: function () {
      return this;
    },
    stackName: () => `${prefix}-stack`,
    exportName: (p: string) => `${prefix}-export-${p}`,
    ssmPath: (p: string) => `/${prefix}/${p}`,
    ssmOrgPath: (p: string) => `/${prefix}/org/${p}`,
    ssmDomainPath: (p: string) => `/${prefix}/domain/${p}`,
    ssmEnvPath: (p: string) => `/${prefix}/env/${p}`,
  };
  return naming;
}

/**
 * Naming mock whose resourceName echoes the derived suffix verbatim (prefixed
 * with "suffix:"), so tests can assert the exact suffix the aspect derives from
 * the construct path independently of any real naming prefix.
 */
function createSuffixEchoNaming(): IMdaaResourceNaming {
  const mockProps: MdaaResourceNamingConfig = {
    cdkNode: undefined as unknown as Node,
    org: 'test-org',
    env: 'dev',
    domain: 'test-domain',
    moduleName: 'test-module',
  };
  const naming: IMdaaResourceNaming = {
    props: mockProps,
    resourceName: (suffix?: string) => `suffix:${suffix ?? ''}`,
    withResourceType: function () {
      return this;
    },
    withOrg: function () {
      return this;
    },
    withEnv: function () {
      return this;
    },
    withDomain: function () {
      return this;
    },
    withModuleName: function () {
      return this;
    },
    withSuffix: function () {
      return this;
    },
    stackName: () => 'test-stack',
    exportName: (p: string) => `export-${p}`,
    ssmPath: (p: string) => `/ssm/${p}`,
    ssmOrgPath: (p: string) => `/org/${p}`,
    ssmDomainPath: (p: string) => `/domain/${p}`,
    ssmEnvPath: (p: string) => `/env/${p}`,
  };
  return naming;
}

describe('InlinePolicyNamingAspect', () => {
  test('renames explicit inline policies', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    new Policy(stack, 'MyPolicy', {
      policyName: 'original-name',
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: ['*'],
          }),
        ],
      }),
      roles: [role],
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp('test-naming-.*'),
    });
  });

  test('renames DefaultPolicy when includeDefaultPolicies is true', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogGroup'],
        resources: ['*'],
      }),
    );

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming, includeDefaultPolicies: true }));
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp('test-naming-.*'),
    });
  });

  test('does not rename DefaultPolicy when includeDefaultPolicies is false', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogGroup'],
        resources: ['*'],
      }),
    );

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming, includeDefaultPolicies: false }));
    const template = Template.fromStack(stack);

    // DefaultPolicy should retain CDK's generated name (not our naming)
    const policies = template.findResources('AWS::IAM::Policy');
    const policyNames = Object.values(policies).map(
      (r: Record<string, unknown>) => (r['Properties'] as Record<string, unknown>)['PolicyName'] as string,
    );
    expect(policyNames.every(name => !name.startsWith('test-naming-'))).toBe(true);
  });

  test('renames DefaultPolicy by default when includeDefaultPolicies is not provided', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    role.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogGroup'],
        resources: ['*'],
      }),
    );

    // No includeDefaultPolicies passed -> exercises the `?? true` default branch.
    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: Match.stringLikeRegexp('test-naming-.*'),
    });
  });

  test('visit ignores an IAM::Policy node without addPropertyOverride', () => {
    const naming = createMockNaming('test-naming');
    const aspect = new InlinePolicyNamingAspect({ naming });

    // Synthetic node that looks like a CfnPolicy by type but lacks addPropertyOverride,
    // exercising the defensive early-return guard in visit().
    const fakeNode = {
      cfnResourceType: 'AWS::IAM::Policy',
      node: { path: 'TestStack/Fake/Resource' },
    } as unknown as import('constructs').IConstruct;

    // Should simply return without throwing.
    expect(() => aspect.visit(fakeNode)).not.toThrow();
  });

  test('does not affect non-IAM-Policy resources', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'my-original-role',
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'my-original-role',
    });
  });

  test('derives kebab-case suffix from construct path, stripping stack and Resource segments', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    // Naming mock that echoes the suffix so we can assert the exact derived value.
    const naming = createSuffixEchoNaming();

    const role = new Role(stack, 'MyServiceRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    new Policy(stack, 'InlineReadPolicy', {
      policyName: 'original-name',
      document: new PolicyDocument({
        statements: [new PolicyStatement({ actions: ['s3:GetObject'], resources: ['*'] })],
      }),
      roles: [role],
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    // Path is TestStack/InlineReadPolicy/Resource -> stack and Resource stripped -> "InlineReadPolicy" -> kebab.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'suffix:inline-read-policy',
    });
  });

  test('shortens DefaultPolicy path segment to defpol in the derived suffix', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createSuffixEchoNaming();

    const role = new Role(stack, 'WorkerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    role.addToPolicy(new PolicyStatement({ actions: ['logs:CreateLogGroup'], resources: ['*'] }));

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming, includeDefaultPolicies: true }));
    const template = Template.fromStack(stack);

    // Path TestStack/WorkerRole/DefaultPolicy/Resource -> "WorkerRole-defpol" -> kebab.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'suffix:worker-role-defpol',
    });
  });

  test('truncates the generated policy name to the 128 character maximum', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    // Naming mock that prepends a long prefix so the result exceeds 128 chars pre-truncation.
    const longPrefix = 'x'.repeat(200);
    const naming = createMockNaming(longPrefix);

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    new Policy(stack, 'MyPolicy', {
      policyName: 'original-name',
      document: new PolicyDocument({
        statements: [new PolicyStatement({ actions: ['s3:GetObject'], resources: ['*'] })],
      }),
      roles: [role],
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    const policies = template.findResources('AWS::IAM::Policy');
    const names = Object.values(policies).map(
      (r: Record<string, unknown>) => (r['Properties'] as Record<string, unknown>)['PolicyName'] as string,
    );
    expect(names.length).toBeGreaterThan(0);
    names.forEach(name => expect(name.length).toBeLessThanOrEqual(128));
  });

  test('renames inline policies embedded in a Role Policies[] array', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    // inlinePolicies produces an AWS::IAM::Role with an embedded Policies[]
    // whose PolicyName is the map key (a static string), mirroring how MDAA
    // hardcodes e.g. HealthLakeS3Access / HealthLakeKmsAccess.
    new Role(stack, 'DataAccessRole', {
      assumedBy: new ServicePrincipal('healthlake.amazonaws.com'),
      inlinePolicies: {
        HealthLakeS3Access: new PolicyDocument({
          statements: [new PolicyStatement({ actions: ['s3:GetObject'], resources: ['*'] })],
        }),
        HealthLakeKmsAccess: new PolicyDocument({
          statements: [new PolicyStatement({ actions: ['kms:Decrypt'], resources: ['*'] })],
        }),
      },
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({ PolicyName: 'test-naming-health-lake-s3-access' }),
        Match.objectLike({ PolicyName: 'test-naming-health-lake-kms-access' }),
      ]),
    });
  });

  test('derives the embedded policy suffix from the original hardcoded name', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createSuffixEchoNaming();

    new Role(stack, 'DataAccessRole', {
      assumedBy: new ServicePrincipal('healthlake.amazonaws.com'),
      inlinePolicies: {
        HealthLakeS3Access: new PolicyDocument({
          statements: [new PolicyStatement({ actions: ['s3:GetObject'], resources: ['*'] })],
        }),
      },
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    // Suffix is derived from the existing name 'HealthLakeS3Access' -> kebab.
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([Match.objectLike({ PolicyName: 'suffix:health-lake-s3-access' })]),
    });
  });

  test('skips embedded policy names that are unresolved CDK tokens', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    // A CDK token is a string at runtime (`${Token[TOKEN.n]}`), so a typeof
    // guard alone lets it through. Slugifying the placeholder would discard the
    // deferred value and embed CDK's global token counter in the policy name,
    // making it change whenever unrelated constructs are added or reordered.
    new CfnRole(stack, 'TokenRole', {
      assumeRolePolicyDocument: { Version: '2012-10-17', Statement: [] },
      policies: [
        {
          policyName: Lazy.string({ produce: () => 'resolved-at-synth-time' }),
          policyDocument: { Version: '2012-10-17', Statement: [] },
        },
      ],
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    const template = Template.fromStack(stack);

    // The token resolves to its own value; the aspect must not have rewritten it.
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([Match.objectLike({ PolicyName: 'resolved-at-synth-time' })]),
    });
  });

  test('leaves a Role without embedded Policies untouched', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const naming = createMockNaming('test-naming');

    new Role(stack, 'PlainRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'plain-role',
    });

    // Should not throw and should not add a Policies property to the role.
    expect(() => {
      Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
      Template.fromStack(stack);
    }).not.toThrow();

    const template = Template.fromStack(stack);
    const roles = template.findResources('AWS::IAM::Role');
    Object.values(roles).forEach((r: Record<string, unknown>) => {
      expect((r['Properties'] as Record<string, unknown>)['Policies']).toBeUndefined();
    });
  });

  test('invokes withResourceType with IAM_POLICY', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const withResourceTypeSpy = jest.fn();

    const mockProps: MdaaResourceNamingConfig = {
      cdkNode: undefined as unknown as Node,
      org: 'test-org',
      env: 'dev',
      domain: 'test-domain',
      moduleName: 'test-module',
    };

    const naming: IMdaaResourceNaming = {
      props: mockProps,
      resourceName: (suffix?: string) => `named-${suffix ?? 'default'}`,
      withResourceType: function (resourceType: MdaaResourceType) {
        withResourceTypeSpy(resourceType);
        return this;
      },
      withOrg: function () {
        return this;
      },
      withEnv: function () {
        return this;
      },
      withDomain: function () {
        return this;
      },
      withModuleName: function () {
        return this;
      },
      withSuffix: function () {
        return this;
      },
      stackName: () => 'test-stack',
      exportName: (p: string) => `export-${p}`,
      ssmPath: (p: string) => `/ssm/${p}`,
      ssmOrgPath: (p: string) => `/org/${p}`,
      ssmDomainPath: (p: string) => `/domain/${p}`,
      ssmEnvPath: (p: string) => `/env/${p}`,
    };

    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    new Policy(stack, 'MyPolicy', {
      policyName: 'test-policy',
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: ['*'],
          }),
        ],
      }),
      roles: [role],
    });

    Aspects.of(app).add(new InlinePolicyNamingAspect({ naming }));
    Template.fromStack(stack);

    expect(withResourceTypeSpy).toHaveBeenCalledWith(MdaaResourceType.IAM_POLICY);
  });
});
