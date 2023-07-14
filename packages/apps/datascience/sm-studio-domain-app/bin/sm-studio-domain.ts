#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SageMakerStudioDomainApp } from "../lib/sm-studio-domain";
new SageMakerStudioDomainApp().generateStack()