/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './alarms';
export * from './authorizer';
export * from './cognito-auth';
export * from './container';
export * from './eventbridge-rules';
export * from './lifecycle';
export * from './log-protection';
export * from './naming';
export * from './network';
export * from './resource-policy';

// The data protection and log retention helpers live in cloudwatch-constructs so that non-AgentCore
// modules can apply the same masking floor; re-exported here for the AgentCore constructs.
export {
  BUILTIN_DATA_IDENTIFIERS,
  buildDataProtectionPolicy,
  DataProtectionProperty,
  validateLogRetentionDays,
} from '@aws-mdaa/cloudwatch-constructs';
