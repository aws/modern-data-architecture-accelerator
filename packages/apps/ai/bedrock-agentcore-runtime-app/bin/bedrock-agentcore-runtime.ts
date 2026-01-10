#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BedrockAgentcoreRuntimeApp } from '../lib';

const app = new BedrockAgentcoreRuntimeApp();
app.generateStack();
app.synth();
