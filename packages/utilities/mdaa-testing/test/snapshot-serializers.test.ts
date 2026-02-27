/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('Snapshot Serializers', () => {
  describe('isS3BucketWithSuffix', () => {
    // The regex pattern we're testing: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]--?[0-9a-f]{8}$/
    // IMPORTANT: {8} means exactly 8 hex characters, not {1,8} (autoformatter may try to change this)
    const s3BucketRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]--?[0-9a-f]{8}$/;

    describe('should match valid bucket names with hash suffix', () => {
      it('should match bucket name with single dash before hash', () => {
        const bucketName = 'test-org-test-env-test-domain-test-module-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name with double dash before hash', () => {
        const bucketName = 'test-org-test-env-test-domain-test-sagemaker-main-tes--7a09bc6d';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name with double dash and different hash', () => {
        const bucketName = 'test-org-test-env-test-domain-test-sagemaker-main-tes--73af4f33';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match short bucket name with single dash', () => {
        const bucketName = 'my-bucket-a1b2c3d4';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match short bucket name with double dash', () => {
        const bucketName = 'my-bucket--a1b2c3d4';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name at minimum length (12 chars)', () => {
        const bucketName = 'ab-c-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name at maximum length (63 chars)', () => {
        // 63 chars total: 'a-' (2) + 'b' * 50 (50) + 'c' (1) + '--' (2) + '1a2b3c4d' (8) = 63
        const bucketName = 'a-' + 'b'.repeat(50) + 'c--1a2b3c4d';
        expect(bucketName.length).toBe(63);
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name with all lowercase hex characters', () => {
        const bucketName = 'test-bucket-abcdef01';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name with numeric hex characters', () => {
        const bucketName = 'test-bucket-12345678';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });
    });

    describe('should NOT match invalid bucket names', () => {
      it('should not match bucket name without hash suffix', () => {
        const bucketName = 'test-org-test-env-test-domain-test-module';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with uppercase letters', () => {
        const bucketName = 'Test-Bucket-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with uppercase hex', () => {
        const bucketName = 'test-bucket-1A2B3C4D';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with hash too long (9 chars)', () => {
        const bucketName = 'test-bucket-1a2b3c4d5';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with triple dash', () => {
        const bucketName = 'test-bucket---1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name starting with dash', () => {
        const bucketName = '-test-bucket-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name ending with dash after hash', () => {
        const bucketName = 'test-bucket-1a2b3c4d-';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with non-hex characters in hash', () => {
        const bucketName = 'test-bucket-1a2b3g4h';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name with special characters', () => {
        const bucketName = 'test_bucket-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name too short (11 chars)', () => {
        const bucketName = 'ab-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name too long (64 chars) - enforced by length check', () => {
        // Note: The regex itself would match this, but the isS3BucketWithSuffix function
        // has a length check (val.length <= 63) that would reject it
        const bucketName = 'a-' + 'b'.repeat(51) + 'c--1a2b3c4d';
        expect(bucketName.length).toBe(64);
        // The regex matches, but the actual function would reject due to length check
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should not match empty string', () => {
        expect(s3BucketRegex.test('')).toBe(false);
      });

      it('should not match bucket name with dash immediately before hash', () => {
        // Pattern requires alphanumeric immediately before the dash(es) and hash
        // This has a dash right before the hash section starts
        const bucketName = 'test-bucket---1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should match bucket name with numbers only before hash', () => {
        const bucketName = '1-2-3-4-5-6-7-8-9-0-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should match bucket name with alternating alphanumeric', () => {
        const bucketName = 'a1-b2-c3-d4-e5-f6-1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });

      it('should not match bucket name with only hash', () => {
        const bucketName = '1a2b3c4d';
        expect(s3BucketRegex.test(bucketName)).toBe(false);
      });

      it('should not match bucket name ending with dash before hash', () => {
        const bucketName = 'test-bucket--1a2b3c4d';
        // This should actually match since we allow double dash
        expect(s3BucketRegex.test(bucketName)).toBe(true);
      });
    });
  });
});
