/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from '@aws-caef/app';
import { JobConfig } from '@aws-caef/dataops-job-l3-construct';
import { CaefDataOpsConfigParser, CaefDataOpsConfigContents } from '@aws-caef/dataops-shared';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';




/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject ( item: any ): any {
  return ( item && typeof item === 'object' && !Array.isArray( item ) );
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep ( target: any, ...sources: any ): any {
  if ( !sources.length ) return target;
  const source = sources.shift();

  if ( isObject( target ) && isObject( source ) ) {
    for ( const key in source ) {
      if ( isObject( source[ key ] ) ) {
        if ( !target[ key ] ) Object.assign( target, { [ key ]: {} } );
        mergeDeep( target[ key ], source[ key ] );
      } else {
        Object.assign( target, { [ key ]: source[ key ] } );
      }
    }
  }

  return mergeDeep( target, ...sources );
}

export interface GlueJobConfigContents extends CaefDataOpsConfigContents {
  /**
   * Name of the Data Ops project. The crawler config will be autowired to use existing resources deployed by the project.
   */
  projectName: string
  /**
   * Map of job names to job definitions 
   */
  jobs: { [ key: string ]: JobConfig }
  /**
   * Map of job template names to job definitions 
   */
  templates?: { [ key: string ]: JobConfig }
}

export class GlueJobConfigParser extends CaefDataOpsConfigParser<GlueJobConfigContents> {

  public readonly jobConfigs: { [ key: string ]: JobConfig }

  private static mergeJobConfigs ( configContents: GlueJobConfigContents ): GlueJobConfigContents {
    //Resolve jobs and their templates
    let resolvedJobConfigs: any = {}
    Object.keys( configContents.jobs ).forEach( jobName => {
      let jobConfig = configContents.jobs[ jobName ]
      if ( jobConfig.template ) {
        if ( !configContents.templates || !configContents.templates.hasOwnProperty( jobConfig.template ) ) {
          throw new Error( `Job Config ${ jobName } references non-existant template: ${ jobConfig.template }` )
        }
        const jobTemplate = configContents.templates[ jobConfig.template ]
        //Create a copy of the template as the merged job definition is not immutable
        const jobTemplateCopy = JSON.parse( JSON.stringify( jobTemplate ) )
        jobConfig = mergeDeep( jobTemplateCopy, jobConfig )
      }
      resolvedJobConfigs = { ...resolvedJobConfigs, ...{ [ jobName ]: jobConfig } }
    } )
    const newConfig = configContents
    newConfig[ "jobs" ] = resolvedJobConfigs
    newConfig[ "templates" ] = undefined
    return newConfig
  }

  private static modifyProps ( props: CaefAppConfigParserProps ): CaefAppConfigParserProps {
    return {
      ...props, ...{
        rawConfig: GlueJobConfigParser.mergeJobConfigs( props.rawConfig as GlueJobConfigContents )
      }
    }
  }

  constructor( stack: Stack, props: CaefAppConfigParserProps ) {
    super( stack, GlueJobConfigParser.modifyProps( props ), configSchema as Schema )
    this.jobConfigs = this.configContents.jobs
  }

}