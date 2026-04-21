#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SageMakerGroundTruthApp } from '../lib/sagemaker-ground-truth';
new SageMakerGroundTruthApp().generateStack();
