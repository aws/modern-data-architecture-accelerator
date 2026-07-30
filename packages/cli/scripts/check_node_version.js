// @ts-check
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {string} */
const nodeVersion = process.versions.node;
/** @type {number} */
const major = parseInt(nodeVersion.split('.')[0], 10);
console.log('Checking Node.JS version');
if (major < 22) {
  console.error(`MDAA requires Node.JS v22 or higher. Found v${nodeVersion}.`);
  process.exit(1);
} else {
  console.log(`Found Node.JS v${nodeVersion}`);
}
