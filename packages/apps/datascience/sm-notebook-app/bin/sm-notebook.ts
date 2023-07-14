#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SageMakerNotebookApp } from "../lib/sm-notebook";
new SageMakerNotebookApp().generateStack()