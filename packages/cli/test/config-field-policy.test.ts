/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FIELD_POLICY_REGISTRIES } from '../lib/config-field-policy';
import { MdaaCliConfig, MdaaConfigContents } from '../lib/mdaa-cli-config-parser';
import * as configJsonSchema from '../lib/config-schema.json';

// The generated JSON schema (from the same TypeScript config interfaces, with
// additionalProperties:false) is the closed source of truth for the field set.
// This cross-check backstops the compile-time `Record<keyof T, FieldPolicy>`
// guarantee against any schema/type drift: every property AJV knows about for a
// classified interface must have an entry in the corresponding policy registry.
describe('config-field-policy registry cross-check against the generated schema', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = configJsonSchema as any;

  const definitionFor = (definitionName: string): Record<string, unknown> => {
    // The top-level config lives at the schema root; nested interfaces live under
    // `definitions`.
    const def = definitionName === 'MdaaConfigContents' ? schema : schema.definitions?.[definitionName];
    expect(def).toBeDefined();
    return def;
  };

  const schemaPropsFor = (definitionName: string): string[] =>
    Object.keys((definitionFor(definitionName).properties as Record<string, unknown>) ?? {});

  // The one-hop `#/definitions/X` targets referenced from a single property's
  // schema subtree, WITHOUT descending into other `$ref`s — i.e. the interfaces a
  // value of this property is (directly) an instance of. `$ref` appears under
  // `items` (arrays), `additionalProperties`/`patternProperties` (maps), or
  // directly / inside an `anyOf` (optional single objects).
  const refTargetsForProperty = (propSchema: unknown): string[] => {
    const targets = new Set<string>();
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const obj = node as Record<string, unknown>;
      const ref = obj.$ref as string | undefined;
      if (ref) {
        const match = /^#\/definitions\/(.+)$/.exec(decodeURIComponent(ref));
        if (match) {
          targets.add(match[1]);
        }
        return; // one hop only — do not follow into the referenced definition
      }
      for (const key of ['items', 'additionalProperties', 'additionalItems']) {
        visit(obj[key]);
      }
      for (const key of ['anyOf', 'oneOf', 'allOf']) {
        visit(obj[key]);
      }
      // patternProperties is a map of pattern -> subschema
      if (obj.patternProperties && typeof obj.patternProperties === 'object') {
        Object.values(obj.patternProperties as Record<string, unknown>).forEach(visit);
      }
    };
    visit(propSchema);
    return [...targets];
  };

  it.each(Object.keys(FIELD_POLICY_REGISTRIES))('every %s schema property is classified in the registry', name => {
    const registry = FIELD_POLICY_REGISTRIES[name];
    const schemaProps = schemaPropsFor(name);
    const unclassified = schemaProps.filter(prop => !(prop in registry));
    expect(unclassified).toEqual([]);
  });

  it.each(Object.keys(FIELD_POLICY_REGISTRIES))(
    'every %s registry key corresponds to a real schema property (no stale entries)',
    name => {
      const registry = FIELD_POLICY_REGISTRIES[name];
      const schemaProps = new Set(schemaPropsFor(name));
      const stale = Object.keys(registry).filter(key => !schemaProps.has(key));
      expect(stale).toEqual([]);
    },
  );

  // Structural closure — the check the key-driven cross-check above structurally
  // CANNOT perform. Iterating `Object.keys(FIELD_POLICY_REGISTRIES)` can only
  // validate the registries that already exist, so a config interface the walker
  // recurses into but that has *no* registry is invisible to it forever. This
  // test drives the obligation from the schema instead: for every `structural`
  // field (the ones `validateLevel` recurses into), the interface(s) its schema
  // `$ref`s must themselves be registered — otherwise the walker would silently
  // stop validating at that boundary. A new structural field pointing at an
  // unregistered interface fails here; quote-only/not-shell fields are opaque
  // blobs (quoted at the sink, never walked) and impose no such obligation.
  it('every interface reached by a structural field has its own registry', () => {
    const unregistered: string[] = [];
    const emptyStructural: string[] = [];
    for (const [ifaceName, registry] of Object.entries(FIELD_POLICY_REGISTRIES)) {
      const props = (definitionFor(ifaceName).properties as Record<string, unknown>) ?? {};
      for (const [field, policy] of Object.entries(registry)) {
        if (policy.kind !== 'structural') {
          continue;
        }
        const targets = refTargetsForProperty(props[field]);
        // A structural field must resolve to at least one referenced interface;
        // otherwise the STRUCTURAL marker has drifted from the schema shape.
        if (targets.length === 0) {
          emptyStructural.push(`${ifaceName}.${field}`);
        }
        for (const target of targets) {
          if (!(target in FIELD_POLICY_REGISTRIES)) {
            unregistered.push(`${ifaceName}.${field} -> ${target}`);
          }
        }
      }
    }
    expect(emptyStructural).toEqual([]);
    expect(unregistered).toEqual([]);
  });
});

// Parse-time fail-fast rejection tests, mirroring the region/account tests in
// mdaa-cli-config.test.ts. Each constrained field rejects concrete garbage at
// parse time and defers `{{...}}` references to post-resolution.
describe('parse-time validation of constrained fields', () => {
  const withGlobal = (extra: Partial<MdaaConfigContents>): MdaaConfigContents =>
    ({
      organization: 'test-org',
      domains: {},
      ...extra,
    }) as MdaaConfigContents;

  describe('organization', () => {
    it.each(['test-org', 'my-org-123'])('accepts a valid organization name %j', value => {
      expect(() => new MdaaCliConfig({ configContents: { organization: value, domains: {} } })).not.toThrow();
    });

    it.each(['bad_org', 'Bad Org', 'a.b'])('rejects a non-name organization %j', value => {
      expect(() => new MdaaCliConfig({ configContents: { organization: value, domains: {} } })).toThrow(/Invalid name/);
    });

    it.each(['org$(id)', 'org;rm -rf /', 'org`id`', 'org && id'])('rejects an injection organization %j', value => {
      expect(() => new MdaaCliConfig({ configContents: { organization: value, domains: {} } })).toThrow(/Invalid name/);
    });

    // Unlike the reference-deferring validated fields (region/account/arn/...),
    // organization is the *root* substitution source for {{...}} references, so it
    // can never itself be a reference. It is validated with the plain name checker
    // (no isConfigReference deferral), so a `{{...}}` value is rejected at parse
    // time rather than deferred. This test pins that intentional asymmetry.
    it.each(['{{context:org}}', '{{env_var:ORG}}'])('rejects a reference organization %j (no deferral)', value => {
      expect(() => new MdaaCliConfig({ configContents: { organization: value, domains: {} } })).toThrow(/Invalid name/);
    });
  });

  describe('domain / env / module names', () => {
    const withDomain = (domainName: string): MdaaConfigContents =>
      withGlobal({ domains: { [domainName]: { environments: {} } } } as Partial<MdaaConfigContents>);
    const withEnv = (envName: string): MdaaConfigContents =>
      withGlobal({
        domains: { 'test-domain': { environments: { [envName]: { modules: {} } } } },
      } as Partial<MdaaConfigContents>);
    const withModule = (moduleName: string): MdaaConfigContents =>
      withGlobal({
        domains: {
          'test-domain': {
            environments: { 'test-env': { modules: { [moduleName]: { module_path: '@test/module' } } } },
          },
        },
      } as Partial<MdaaConfigContents>);

    // Names are map keys, not values, so they carry no reference/defer semantics —
    // the meaningful classes are happy-path and rejection (format + injection). A
    // name flows into `-c domain=`, TF `-var domain=`, module paths and working
    // dirs, so an injection payload must be rejected at parse time even though the
    // sink also quotes it.
    it.each(['dom$(id)', 'dom;rm -rf /', 'dom`id`', 'dom && id', 'dom|id'])(
      'rejects an injection domain name %j',
      value => {
        expect(() => new MdaaCliConfig({ configContents: withDomain(value) })).toThrow(/Invalid name/);
      },
    );

    it.each(['env$(id)', 'env;id', 'env`id`'])('rejects an injection env name %j', value => {
      expect(() => new MdaaCliConfig({ configContents: withEnv(value) })).toThrow(/Invalid name/);
    });

    it.each(['mod$(id)', 'mod;id', 'mod`id`'])('rejects an injection module name %j', value => {
      expect(() => new MdaaCliConfig({ configContents: withModule(value) })).toThrow(/Invalid name/);
    });
  });

  describe('permissions_boundary_arn', () => {
    it.each([
      'arn:aws:iam::123456789012:policy/boundary',
      'arn:aws-us-gov:iam::123456789012:policy/path/to/boundary',
      // AWS-managed policy ARNs place the literal `aws` in the account segment.
      'arn:aws:iam::aws:policy/PowerUserAccess',
      'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
      '{{context:boundary_arn}}',
    ])('accepts a valid ARN / reference %j', value => {
      expect(
        () => new MdaaCliConfig({ configContents: withGlobal({ permissions_boundary_arn: value }) }),
      ).not.toThrow();
    });

    it.each([
      'arn:aws:iam::123456789012:policy/boundary$(id)',
      'arn:aws:iam::123456789012:policy/boundary;rm -rf /',
      'not-an-arn',
      'arn:aws:iam::123456789012:policy/boundary`id`',
    ])('rejects a malformed / injection ARN %j', value => {
      expect(() => new MdaaCliConfig({ configContents: withGlobal({ permissions_boundary_arn: value }) })).toThrow(
        /Invalid permissions_boundary_arn/,
      );
    });
  });

  describe('naming_class', () => {
    it.each(['TestNaming', 'CustomNaming', '_Impl', '$Factory', '{{context:naming_class}}'])(
      'accepts a valid identifier / reference %j',
      value => {
        // naming_module and naming_class must be specified together.
        expect(
          () => new MdaaCliConfig({ configContents: withGlobal({ naming_module: './naming', naming_class: value }) }),
        ).not.toThrow();
      },
    );

    it.each(['Bad Class', 'Bad;Class', 'Class$(id)', 'Class`id`', 'a.b'])(
      'rejects a non-identifier naming_class %j',
      value => {
        expect(
          () => new MdaaCliConfig({ configContents: withGlobal({ naming_module: './naming', naming_class: value }) }),
        ).toThrow(/Invalid naming_class/);
      },
    );
  });

  describe('aspect_class', () => {
    const withAspect = (aspectClass: string): MdaaConfigContents =>
      withGlobal({
        custom_aspects: [{ aspect_module: './aspect', aspect_class: aspectClass }],
      } as Partial<MdaaConfigContents>);

    it.each(['TestAspect', 'CustomAspect', '_Impl', '$Factory', '{{context:aspect_class}}'])(
      'accepts a valid identifier / reference %j',
      value => {
        expect(() => new MdaaCliConfig({ configContents: withAspect(value) })).not.toThrow();
      },
    );

    it.each(['Bad Aspect', 'Bad;Aspect', 'Aspect$(id)', 'Aspect`id`', 'a.b'])(
      'rejects a non-identifier aspect_class %j',
      value => {
        expect(() => new MdaaCliConfig({ configContents: withAspect(value) })).toThrow(/Invalid aspect_class/);
      },
    );

    it('rejects an injection aspect_class in a nested (module-level) custom_aspects entry', () => {
      const contents = withGlobal({
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'test-module': {
                    module_path: '@test/module',
                    custom_aspects: [{ aspect_module: './aspect', aspect_class: 'C$(id)' }],
                  },
                },
              },
            },
          },
        },
      });
      expect(() => new MdaaCliConfig({ configContents: contents })).toThrow(/Invalid aspect_class/);
    });
  });

  describe('mdaa_version', () => {
    it.each([
      '1.6.0',
      'latest',
      '^1.2.3',
      '~1.2.3',
      '1.2.3-beta.1',
      'test_global_version',
      // node-semver range syntax — mdaa_version is an npm specifier (CONFIGURATION.md
      // documents `>=1.00.0`), so comparators, wildcards, OR, and intersection
      // ranges must all parse.
      '>=1.0.0',
      '>=1.00.0',
      '>1.0.0',
      '<2.0.0',
      '1.x',
      '*',
      '1.0.0 || 2.0.0',
      '>=1.0.0 <2.0.0',
      '1.2.3 - 2.3.4',
      '{{env_var:MDAA_VERSION}}',
    ])('accepts a valid version / range / tag / reference %j', value => {
      expect(() => new MdaaCliConfig({ configContents: withGlobal({ mdaa_version: value }) })).not.toThrow();
    });

    it.each(['1.0.0$(id)', '1.0.0;id', '`id`', '1.0.0 && id', '1.0.0 > /tmp/x', "1.0.0'; id; '"])(
      'rejects an injection version %j',
      value => {
        expect(() => new MdaaCliConfig({ configContents: withGlobal({ mdaa_version: value }) })).toThrow(
          /Invalid mdaa_version/,
        );
      },
    );

    // Bad-format-but-not-injection: the fourth required test class. These carry no
    // shell metacharacter, so they exercise the fail-fast format check itself (not
    // the injection path). `/` is excluded by MDAA_VERSION_PATTERN because a version
    // specifier never contains a path separator; `@` separates package from version
    // in the npm specifier and so is not a legal part of the version segment.
    it.each(['1.0.0/beta', '@1.0.0'])('rejects a malformed (non-injection) version %j', value => {
      expect(() => new MdaaCliConfig({ configContents: withGlobal({ mdaa_version: value }) })).toThrow(
        /Invalid mdaa_version/,
      );
    });
  });

  describe('nested field validation', () => {
    it('rejects an invalid module-level mdaa_version', () => {
      const contents = withGlobal({
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'test-module': { module_path: '@test/module', mdaa_version: 'v$(id)' },
                },
              },
            },
          },
        },
      });
      expect(() => new MdaaCliConfig({ configContents: contents })).toThrow(/Invalid mdaa_version/);
    });

    it('rejects an invalid env-level permissions_boundary_arn', () => {
      const contents = withGlobal({
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                permissions_boundary_arn: 'not-an-arn',
                modules: {},
              },
            },
          },
        },
      });
      expect(() => new MdaaCliConfig({ configContents: contents })).toThrow(/Invalid permissions_boundary_arn/);
    });

    it('rejects an invalid custom_naming.naming_class at the domain level', () => {
      const contents = withGlobal({
        domains: {
          'test-domain': {
            custom_naming: { naming_module: './naming', naming_class: 'Bad;Class' },
            environments: {},
          },
        },
      });
      expect(() => new MdaaCliConfig({ configContents: contents })).toThrow(/Invalid naming_class/);
    });
  });
});
