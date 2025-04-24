#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditTrailCDKApp } from '../lib/audit-trail';

const app = new AuditTrailCDKApp();
app.generateStack();
