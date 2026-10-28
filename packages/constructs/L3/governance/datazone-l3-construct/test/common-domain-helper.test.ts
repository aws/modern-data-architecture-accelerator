/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnOwner } from 'aws-cdk-lib/aws-datazone';
import { CommonDomainHelper } from '../lib/private/common-domain-helper';

/**
 * Returns the DependsOn array for the given logical id, or undefined.
 * Reads from the synthesized template since `CfnOwner.logicalId` is a token until synth.
 */
function getDependsOn(template: Template, logicalId: string): string[] | undefined {
  const json = template.toJSON() as { Resources: Record<string, { DependsOn?: string[] }> };
  return json.Resources[logicalId]?.DependsOn;
}

/**
 * Returns the synthesized logical ids of all AWS::DataZone::Owner resources, in
 * the order CDK assigned them. The order is stable across `addDependency` calls.
 */
function listOwnerLogicalIds(template: Template): string[] {
  const json = template.toJSON() as { Resources: Record<string, { Type: string }> };
  return Object.entries(json.Resources)
    .filter(([, res]) => res.Type === 'AWS::DataZone::Owner')
    .map(([id]) => id);
}

function makeOwner(stack: Stack, id: string, userIdentifier: string, entityIdentifier = 'du-1'): CfnOwner {
  return new CfnOwner(stack, id, {
    domainIdentifier: 'd-1',
    entityIdentifier,
    entityType: 'DOMAIN_UNIT',
    owner: { user: { userIdentifier } },
  });
}

/** Owner-only DependsOn entries for a logical id. */
function ownerDepsOf(template: Template, logicalId: string, ownerIds: string[]): string[] {
  return (getDependsOn(template, logicalId) ?? []).filter(d => ownerIds.includes(d));
}

describe('CommonDomainHelper.chainOwnersSequentially', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  test('forms a linear DependsOn chain across multiple owners', () => {
    const owner1 = makeOwner(stack, 'Owner1', 'user1');
    const owner2 = makeOwner(stack, 'Owner2', 'user2');
    const owner3 = makeOwner(stack, 'Owner3', 'user3');
    const owner4 = makeOwner(stack, 'Owner4', 'user4');

    CommonDomainHelper.chainOwnersSequentially([owner1, owner2, owner3, owner4]);

    const template = Template.fromStack(stack);
    const ownerIds = listOwnerLogicalIds(template);
    expect(ownerIds).toHaveLength(4);

    // First owner has no synthetic dependency from the chain
    const firstDeps = getDependsOn(template, ownerIds[0]) ?? [];
    expect(firstDeps.filter(d => ownerIds.includes(d))).toEqual([]);

    // Each subsequent owner DependsOn its immediate predecessor only
    for (let i = 1; i < ownerIds.length; i++) {
      const deps = getDependsOn(template, ownerIds[i]) ?? [];
      const ownerDeps = deps.filter(d => ownerIds.includes(d));
      expect(ownerDeps).toEqual([ownerIds[i - 1]]);
    }
  });

  test('empty array is a no-op (no synth errors, no resources added)', () => {
    expect(() => CommonDomainHelper.chainOwnersSequentially([])).not.toThrow();
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::DataZone::Owner', 0);
  });

  test('single-element array produces no DependsOn entries', () => {
    const onlyOwner = makeOwner(stack, 'OnlyOwner', 'user1');

    CommonDomainHelper.chainOwnersSequentially([onlyOwner]);

    const template = Template.fromStack(stack);
    const ownerIds = listOwnerLogicalIds(template);
    expect(ownerIds).toHaveLength(1);

    const deps = getDependsOn(template, ownerIds[0]) ?? [];
    expect(deps.filter(d => ownerIds.includes(d))).toEqual([]);
  });

  test('preserves existing non-chain DependsOn entries on chained owners', () => {
    const owner1 = makeOwner(stack, 'Owner1', 'user1');
    const owner2 = makeOwner(stack, 'Owner2', 'user2');
    // Pre-existing dependency that is NOT part of the chain
    const unrelated = makeOwner(stack, 'Unrelated', 'userX');
    owner2.addResourceDependency(unrelated);

    CommonDomainHelper.chainOwnersSequentially([owner1, owner2]);

    const template = Template.fromStack(stack);
    const ownerIds = listOwnerLogicalIds(template);
    // Find owner2's synthesized id by inspecting which DependsOn lists include owner1's id
    // Easier: there are exactly 3 owners. owner1 chain-deps = none, unrelated chain-deps = none,
    // owner2 chain-deps include owner1 AND unrelated.
    let owner2SynthId: string | undefined;
    for (const id of ownerIds) {
      const deps = getDependsOn(template, id) ?? [];
      if (deps.length >= 2 && deps.every(d => ownerIds.includes(d))) {
        owner2SynthId = id;
        break;
      }
    }
    expect(owner2SynthId).toBeDefined();
    const owner2Deps = getDependsOn(template, owner2SynthId as string) ?? [];
    expect(owner2Deps.length).toBe(2); // owner1 (chain) + unrelated (pre-existing)
  });

  test('chains owners per target entity, not across entities', () => {
    // Two domain units, two owners each. Owners must only chain within their unit
    // so that distinct domain units still deploy in parallel.
    const a1 = makeOwner(stack, 'UnitAOwner1', 'u1', 'du-A');
    const a2 = makeOwner(stack, 'UnitAOwner2', 'u2', 'du-A');
    const b1 = makeOwner(stack, 'UnitBOwner1', 'u3', 'du-B');
    const b2 = makeOwner(stack, 'UnitBOwner2', 'u4', 'du-B');

    CommonDomainHelper.chainOwnersSequentially([a1, b1, a2, b2]);

    const template = Template.fromStack(stack);
    const ownerIds = listOwnerLogicalIds(template);
    expect(ownerIds).toHaveLength(4);

    const json = template.toJSON() as { Resources: Record<string, { Properties: { EntityIdentifier?: string } }> };

    // Exactly one chain head per entity (du-A and du-B), and every dependency
    // stays within its own entity group.
    const entityOf = (id: string) => json.Resources[id].Properties.EntityIdentifier as string;
    const headsByEntity: Record<string, number> = {};
    // Out-degree per owner, and the entity of each owner's dependency (or its own
    // entity when it is a head) — collected unconditionally, asserted below.
    const outDegrees = ownerIds.map(id => ownerDepsOf(template, id, ownerIds).length);
    const depEntityMatches = ownerIds.map(id => {
      const deps = ownerDepsOf(template, id, ownerIds);
      if (deps.length === 0) {
        headsByEntity[entityOf(id)] = (headsByEntity[entityOf(id)] ?? 0) + 1;
        return true;
      }
      return entityOf(deps[0]) === entityOf(id);
    });

    expect(Math.max(...outDegrees)).toBeLessThanOrEqual(1); // linear within each group
    expect(depEntityMatches.every(Boolean)).toBe(true); // no cross-entity edges
    expect(headsByEntity['du-A']).toBe(1);
    expect(headsByEntity['du-B']).toBe(1);
  });

  test('chain order is derived from owner construct id, stable across input order', () => {
    // Same owners, two different input orders → identical DependsOn chain.
    const chainFor = (order: 'forward' | 'reverse'): Record<string, string[]> => {
      const s = new Stack();
      const o1 = makeOwner(s, 'owner-user-aaa', 'u1');
      const o2 = makeOwner(s, 'owner-user-bbb', 'u2');
      const o3 = makeOwner(s, 'owner-user-ccc', 'u3');
      CommonDomainHelper.chainOwnersSequentially(order === 'forward' ? [o1, o2, o3] : [o3, o2, o1]);
      const t = Template.fromStack(s);
      const ids = listOwnerLogicalIds(t);
      return Object.fromEntries(ids.map(id => [id, ownerDepsOf(t, id, ids)]));
    };

    expect(chainFor('reverse')).toEqual(chainFor('forward'));

    // And the order follows the construct id: aaa (head) <- bbb <- ccc.
    const t = Template.fromStack(
      (() => {
        const s = new Stack();
        CommonDomainHelper.chainOwnersSequentially([
          makeOwner(s, 'owner-user-ccc', 'u3'),
          makeOwner(s, 'owner-user-aaa', 'u1'),
          makeOwner(s, 'owner-user-bbb', 'u2'),
        ]);
        return s;
      })(),
    );
    const ids = listOwnerLogicalIds(t);
    const idFor = (frag: string) => ids.find(id => id.toLowerCase().includes(frag))!;
    expect(ownerDepsOf(t, idFor('aaa'), ids)).toEqual([]); // head
    expect(ownerDepsOf(t, idFor('bbb'), ids)).toEqual([idFor('aaa')]);
    expect(ownerDepsOf(t, idFor('ccc'), ids)).toEqual([idFor('bbb')]);
  });
});
