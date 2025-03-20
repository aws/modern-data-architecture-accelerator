#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaBootstrapCDKApp } from '../lib/bootstrap';
new MdaaBootstrapCDKApp().generateStack();
