/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deriveUserProfileName } from '../lib/user-profile';

describe('deriveUserProfileName', () => {
  test('passes through simple alphanumeric IDs unchanged', () => {
    expect(deriveUserProfileName('user1')).toBe('user1');
  });

  test('replaces non-word characters with hyphens', () => {
    expect(deriveUserProfileName('user@example.com')).toBe('user-example-com');
  });

  test('replaces spaces with hyphens', () => {
    expect(deriveUserProfileName('first last')).toBe('first-last');
  });

  test('replaces multiple consecutive special chars', () => {
    expect(deriveUserProfileName('user!!name')).toBe('user--name');
  });

  test('handles hyphens (already word chars)', () => {
    expect(deriveUserProfileName('lead-ds')).toBe('lead-ds');
  });

  test('handles underscores (already word chars)', () => {
    expect(deriveUserProfileName('lead_ds')).toBe('lead_ds');
  });

  test('handles empty string', () => {
    expect(deriveUserProfileName('')).toBe('');
  });
});
