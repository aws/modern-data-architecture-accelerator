#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlueJobCDKApp } from '../lib/dataops-job';
new GlueJobCDKApp().generateStack();
