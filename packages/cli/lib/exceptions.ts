/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export class DuplicateAccountLevelModulesException<T> implements Error {
  constructor(readonly duplicates: T[]) {
    this.message = `Found account-level modules that will be deployed more than once`;
    this.name = 'DuplicateAccountLevelModulesException';
  }

  message: string;
  name: string;
}
