#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventBridgeCDKApp } from '../lib/eventbridge';
new EventBridgeCDKApp().generateStack();
