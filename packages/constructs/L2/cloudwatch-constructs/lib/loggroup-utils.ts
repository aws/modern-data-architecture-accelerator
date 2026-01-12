/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogGroupProps } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { MdaaLogGroupProps } from './loggroup';

/**
 * Update log group props with MDAA-specific overrides.
 * Applies naming conventions and sets removal policy to RETAIN.
 *
 * @param props - The MDAA log group props to update
 * @returns Updated LogGroupProps with MDAA overrides applied
 */
export function updateProps(props: MdaaLogGroupProps): LogGroupProps {
  const pathPrefix = props.logGroupNamePathPrefix.endsWith('/')
    ? props.logGroupNamePathPrefix
    : props.logGroupNamePathPrefix + '/';
  const overrideProps = {
    logGroupName: pathPrefix + props.naming.resourceName(props.logGroupName),
    removalPolicy: RemovalPolicy.RETAIN,
  };
  return { ...props, ...overrideProps };
}
