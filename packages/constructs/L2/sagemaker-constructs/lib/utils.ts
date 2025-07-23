/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Based on requirements in https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstance.html
 */
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
