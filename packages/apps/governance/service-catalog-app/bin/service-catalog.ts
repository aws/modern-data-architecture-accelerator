#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceCatalogCDKApp } from "../lib/service-catalog";
new ServiceCatalogCDKApp().generateStack()
