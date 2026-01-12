/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';

/**
 * Convert string comparison operator to ComparisonOperator enum.
 * Maps common comparison operator strings to their corresponding CloudWatch ComparisonOperator enum values.
 *
 * @param operator - The comparison operator string to convert
 * @returns The corresponding ComparisonOperator enum value
 * @throws Error if the operator string is not recognized
 */
export function convertComparisonOperator(operator: string): ComparisonOperator {
  const operatorMap: { [key: string]: ComparisonOperator } = {
    GreaterThanOrEqualToThreshold: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    GreaterThanThreshold: ComparisonOperator.GREATER_THAN_THRESHOLD,
    LessThanThreshold: ComparisonOperator.LESS_THAN_THRESHOLD,
    LessThanOrEqualToThreshold: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    LessThanLowerOrGreaterThanUpperThreshold: ComparisonOperator.LESS_THAN_LOWER_OR_GREATER_THAN_UPPER_THRESHOLD,
    LessThanLowerThreshold: ComparisonOperator.LESS_THAN_LOWER_THRESHOLD,
    GreaterThanUpperThreshold: ComparisonOperator.GREATER_THAN_UPPER_THRESHOLD,
  };

  const mappedOperator = operatorMap[operator];
  if (!mappedOperator) {
    throw new Error(`Invalid comparison operator: ${operator}. Must be one of: ${Object.keys(operatorMap).join(', ')}`);
  }

  return mappedOperator;
}

/**
 * Convert string treat missing data value to TreatMissingData enum.
 * Maps common treat missing data strings to their corresponding CloudWatch TreatMissingData enum values.
 *
 * @param treatment - The treat missing data string to convert (optional)
 * @returns The corresponding TreatMissingData enum value, defaults to NOT_BREACHING if not provided
 * @throws Error if the treatment string is not recognized
 */
export function convertTreatMissingData(treatment?: string): TreatMissingData {
  if (!treatment) {
    return TreatMissingData.NOT_BREACHING;
  }

  const treatmentMap: { [key: string]: TreatMissingData } = {
    notBreaching: TreatMissingData.NOT_BREACHING,
    breaching: TreatMissingData.BREACHING,
    ignore: TreatMissingData.IGNORE,
    missing: TreatMissingData.MISSING,
  };

  const mappedTreatment = treatmentMap[treatment];
  if (!mappedTreatment) {
    throw new Error(
      `Invalid treat missing data value: ${treatment}. Must be one of: ${Object.keys(treatmentMap).join(', ')}`,
    );
  }

  return mappedTreatment;
}
