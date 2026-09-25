/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './bedrock-builder-l3-construct';
// The VPC endpoint set config surface, so the app package's config parser can type it without reaching
// into the module file.
export {
  NamedVpcEndpointSetProps,
  S3ImageLayerEndpointProps,
  VpcEndpointProps,
  VpcEndpointSetProps,
} from './supporting-vpc-endpoints';
