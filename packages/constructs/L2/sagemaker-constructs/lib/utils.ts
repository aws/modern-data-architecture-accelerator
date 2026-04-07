/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// ---- Model Monitor helpers -------------------------------------------------

export function validateScheduleExpression(value: string): void {
  if (!/^(cron|rate)\(.+\)$/.test(value)) {
    throw new Error(`schedule must be a valid cron(...) or rate(...) expression, got: ${value}`);
  }
}

// ---- Ground Truth helpers --------------------------------------------------
// Based on requirements in https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateLabelingJob.html

export function validateNumberOfHumanWorkersPerDataObject(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error(`numberOfHumanWorkersPerDataObject must be an integer between 1 and 9, got: ${value}`);
  }
}

export function validateTaskTimeLimitInSeconds(value: number): void {
  if (!Number.isInteger(value) || value < 30 || value > 28800) {
    throw new Error(`taskTimeLimitInSeconds must be an integer between 30 and 28800, got: ${value}`);
  }
}

export function validateTaskAvailabilityLifetimeInSeconds(value: number): void {
  if (!Number.isInteger(value) || value < 60 || value > 864000) {
    throw new Error(`taskAvailabilityLifetimeInSeconds must be an integer between 60 and 864000, got: ${value}`);
  }
}

export function serializeTaskPrice(price: number): string {
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error(`taskPrice must be a positive integer (tenthFractionsOfACent), got: ${price}`);
  }
  return JSON.stringify({
    AmountInUsd: {
      Dollars: Math.floor(price / 1000),
      Cents: Math.floor(price / 10) % 100,
      TenthFractionsOfACent: price % 10,
    },
  });
}

// ---- Notebook helpers ------------------------------------------------------
// Based on requirements in https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstance.html
const NOTEBOOK_NAME_REGEX = /^[a-zA-Z0-9](?:-*[a-zA-Z0-9])*$/;

export class InvalidNotebookNameError implements Error {
  constructor(notebookName: string, reason: string) {
    this.message = `${reason}: ${notebookName}`;
    this.name = 'InvalidAccountNameError';
  }

  message: string;
  name: string;
}

export const MAX_NOTEBOOK_NAME_LENGTH = 63;

export function sanitizeNotebookName(notebookName: string): string {
  const originalNotebookName = notebookName;
  // Remove all characters except alphanumeric and hyphens
  notebookName = notebookName.replace(/[^a-zA-Z0-9-]/g, '');

  // Remove leading hyphens (string must start with alphanumeric)
  notebookName = notebookName.replace(/^-+/, '');

  // Remove trailing hyphens (string must end with alphanumeric)
  // This regex is safe: no nested or ambiguous quantifiers.
  notebookName = notebookName.replace(/-+$/, ''); // NOSONAR

  // Replace multiple consecutive hyphens with a single hyphen
  notebookName = notebookName.replace(/-+/g, '-');

  if (!NOTEBOOK_NAME_REGEX.test(notebookName)) {
    throw new InvalidNotebookNameError(notebookName, `Notebook name must match regex: ${NOTEBOOK_NAME_REGEX}`);
  }

  if (notebookName.length > MAX_NOTEBOOK_NAME_LENGTH) {
    throw new InvalidNotebookNameError(
      notebookName,
      `Notebook name must be less than ${MAX_NOTEBOOK_NAME_LENGTH} characters`,
    );
  }
  if (originalNotebookName !== notebookName) {
    console.warn(`Notebook name was sanitized from: ${originalNotebookName}`);
  }
  return notebookName;
}
