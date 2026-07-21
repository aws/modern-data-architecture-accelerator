/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LifecycleHelper } from '../lib';

describe('LifecycleHelper.resolveLifecycleRules', () => {
  test('resolves a full rule with transitions, expiration, and noncurrent handling', () => {
    const rules = LifecycleHelper.resolveLifecycleRules([
      {
        id: 'archive-data',
        status: 'Enabled',
        prefix: 'data/',
        objectSizeGreaterThan: 128,
        objectSizeLessThan: 1024,
        abortIncompleteMultipartUploadAfter: 7,
        transitions: [
          { days: 90, storageClass: 'STANDARD_IA' },
          { days: 365, storageClass: 'GLACIER' },
        ],
        expirationdays: 730,
        expiredObjectDeleteMarker: true,
        noncurrentVersionTransitions: [{ days: 30, storageClass: 'GLACIER', newerNoncurrentVersions: 2 }],
        noncurrentVersionExpirationDays: 90,
        noncurrentVersionsToRetain: 3,
      },
    ]);

    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.id).toBe('archive-data');
    expect(rule.enabled).toBe(true);
    expect(rule.prefix).toBe('data/');
    expect(rule.objectSizeGreaterThan).toBe(128);
    expect(rule.objectSizeLessThan).toBe(1024);
    expect(rule.abortIncompleteMultipartUploadAfter?.toDays()).toBe(7);
    expect(rule.expiration?.toDays()).toBe(730);
    expect(rule.expiredObjectDeleteMarker).toBe(true);
    expect(rule.transitions).toHaveLength(2);
    expect(rule.transitions?.[0].storageClass.value).toBe('STANDARD_IA');
    expect(rule.transitions?.[0].transitionAfter?.toDays()).toBe(90);
    expect(rule.transitions?.[1].storageClass.value).toBe('GLACIER');
    expect(rule.transitions?.[1].transitionAfter?.toDays()).toBe(365);
    expect(rule.noncurrentVersionTransitions).toHaveLength(1);
    expect(rule.noncurrentVersionTransitions?.[0].storageClass.value).toBe('GLACIER');
    expect(rule.noncurrentVersionTransitions?.[0].transitionAfter?.toDays()).toBe(30);
    expect(rule.noncurrentVersionTransitions?.[0].noncurrentVersionsToRetain).toBe(2);
    expect(rule.noncurrentVersionExpiration?.toDays()).toBe(90);
    expect(rule.noncurrentVersionsToRetain).toBe(3);
  });

  test('resolves a disabled minimal rule and omits optional fields', () => {
    const rules = LifecycleHelper.resolveLifecycleRules([{ id: 'expire-temp', status: 'Disabled', prefix: 'temp/' }]);

    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.enabled).toBe(false);
    expect(rule.abortIncompleteMultipartUploadAfter).toBeUndefined();
    expect(rule.transitions).toBeUndefined();
    expect(rule.expiration).toBeUndefined();
    expect(rule.noncurrentVersionTransitions).toBeUndefined();
    expect(rule.noncurrentVersionExpiration).toBeUndefined();
  });

  test('treats status case-insensitively', () => {
    expect(LifecycleHelper.resolveLifecycleRules([{ id: 'r', status: 'ENABLED' }])[0].enabled).toBe(true);
    expect(LifecycleHelper.resolveLifecycleRules([{ id: 'r', status: 'enabled' }])[0].enabled).toBe(true);
    expect(LifecycleHelper.resolveLifecycleRules([{ id: 'r', status: 'foo' }])[0].enabled).toBe(false);
  });

  test('omits noncurrentVersionsToRetain on transitions when newerNoncurrentVersions is not set', () => {
    const rules = LifecycleHelper.resolveLifecycleRules([
      {
        id: 'r',
        status: 'Enabled',
        noncurrentVersionTransitions: [{ days: 30, storageClass: 'GLACIER' }],
      },
    ]);
    expect(rules[0].noncurrentVersionTransitions?.[0].noncurrentVersionsToRetain).toBeUndefined();
  });

  test('resolves multiple rules independently and preserves order', () => {
    const rules = LifecycleHelper.resolveLifecycleRules([
      { id: 'first', status: 'Enabled', prefix: 'temp/', expirationdays: 7 },
      { id: 'second', status: 'Disabled', prefix: 'logs/', expirationdays: 90 },
      { id: 'third', status: 'Enabled', transitions: [{ days: 30, storageClass: 'GLACIER' }] },
    ]);

    expect(rules).toHaveLength(3);
    expect(rules[0].id).toBe('first');
    expect(rules[0].enabled).toBe(true);
    expect(rules[0].prefix).toBe('temp/');
    expect(rules[0].expiration?.toDays()).toBe(7);
    expect(rules[1].id).toBe('second');
    expect(rules[1].enabled).toBe(false);
    expect(rules[1].prefix).toBe('logs/');
    expect(rules[1].expiration?.toDays()).toBe(90);
    expect(rules[2].id).toBe('third');
    expect(rules[2].enabled).toBe(true);
    expect(rules[2].transitions?.[0].storageClass.value).toBe('GLACIER');
    expect(rules[2].transitions?.[0].transitionAfter?.toDays()).toBe(30);
  });
});
