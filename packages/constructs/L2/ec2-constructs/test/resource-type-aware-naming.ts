/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming, MdaaDefaultResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';

/**
 * A resource-type-aware naming stub for Name-tag and resource-name assertions.
 *
 * MdaaDefaultResourceNaming.withResourceType() returns `this`, so a name derived from the default
 * naming is identical whether a construct threads its MdaaResourceType through or omits the call
 * entirely -- an assertion built that way passes either way, and passes under a wrong type too.
 * Folding the type into the name via withSuffix makes generated names diverge by type, so the type
 * a construct uses is pinned rather than implied.
 */
export class ResourceTypeAwareNaming extends MdaaDefaultResourceNaming {
  public withResourceType(resourceType: MdaaResourceType): IMdaaResourceNaming {
    return this.withSuffix(resourceType);
  }
}
