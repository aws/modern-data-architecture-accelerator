#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');
require(path.resolve(__dirname, '..', 'scripts', 'check_node_version.js'));
console.log('');
require(path.resolve(__dirname, '..', 'lib', 'mdaa'));
