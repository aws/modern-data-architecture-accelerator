#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SageMakerBatchInferenceApp } from '../lib/sagemaker-batch-inference';
new SageMakerBatchInferenceApp().generateStack();
