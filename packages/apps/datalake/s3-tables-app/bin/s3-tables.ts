#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { S3TablesCDKApp } from '../lib/s3-tables';
new S3TablesCDKApp().generateStack();
