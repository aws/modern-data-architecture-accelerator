/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefCfnCrawler } from '@aws-caef/glue-constructs';
import { Construct } from 'constructs';
import { CfnCrawler } from 'aws-cdk-lib/aws-glue';
import { DataOpsProjectUtils } from '@aws-caef/dataops-project-l3-construct';
import { EventBridgeHelper } from '@aws-caef/eventbridge-helper';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { CaefSnsTopic } from '@aws-caef/sns-constructs';
import { Rule } from 'aws-cdk-lib/aws-events';

export interface CrawlerTargets {
    /**
     * Target Definition for Catalog.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-catalogtarget.html
     */
    readonly catalogTargets?: CfnCrawler.CatalogTargetProperty[]
    /**
     * Target Definition for DynamoDB.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-dynamodbtarget.html
     */
    readonly dynamoDbTargets?: CfnCrawler.DynamoDBTargetProperty[]
    /**
     * Target Definition for JDBC.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-jdbctarget.html
     */
    readonly jdbcTargets?: CfnCrawler.JdbcTargetProperty[]
    /**
     * Target Definition for   See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-s3target.html
     */
    readonly s3Targets?: CfnCrawler.S3TargetProperty[]
}

export interface CrawlerDefinition {
    /**
     * Arn of the execution role
     */
    readonly executionRoleArn: string
    /**
     * Name of the database to crawl from the crawler.yaml configuration.
     */
    readonly databaseName: string
    /**
     * Description for the Crawler
     */
    readonly description: string
    /**
     * Targets to retrieve data from for the crawler.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-targets.html
     */
    readonly targets: CrawlerTargets
    /**
     * Crawler configuration as a string.  See:  https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html
     */
    readonly extraConfiguration?: { [ key: string ]: any }
    /**
     * Crawler schedule.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schedule.html
     */
    readonly schedule?: CfnCrawler.ScheduleProperty
    /**
     * Crawler schema change policy.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schemachangepolicy.html
     */
    readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty
    /**
     * Prefix to use in front of all crawled table names
     */
    readonly tablePrefix?: string
    /**
     * Name of the custom classifier to use from the crawler.yaml configuration
     */
    readonly classifiers?: string[]
    /**
     * Recrawl behaviour: CRAWL_NEW_FOLDERS_ONLY or CRAWL_EVERYTHING or CRAWL_EVENT_MODE
     */
    readonly recrawlBehavior?: string
}

export interface GlueCrawlerL3ConstructProps extends CaefL3ConstructProps {
    /**
     * Map of names to crawler configs 
     */
    readonly crawlerConfigs: { [ key: string ]: CrawlerDefinition };
    /**
     * Name of the Glue SecurityConfiguration which will be used by all Crawlers. Can be obtained from the DataOps Project.
     */
    readonly securityConfigurationName: string;
    /**
     * Name of the DataOps project to which the Crawler will be asscoiated
     */
    readonly projectName: string;
    /**
     * Notification topic Arn 
     */
    readonly notificationTopicArn: string;

}

export class GlueCrawlerL3Construct extends CaefL3Construct<GlueCrawlerL3ConstructProps> {

    constructor( scope: Construct, id: string, props: GlueCrawlerL3ConstructProps ) {
        super( scope, id, props );


        // Build our crawlers!
        Object.keys( this.props.crawlerConfigs ).forEach( crawlerName => {

            const crawlerConfig = this.props.crawlerConfigs[ crawlerName ]
            // Classifiers are a bit of a special case since they're an array and may be undefined.
            let includedClassifiers = {}
            if ( crawlerConfig.classifiers ) {
                includedClassifiers = { classifiers: crawlerConfig.classifiers }
            }

            const crawler = new CaefCfnCrawler( this.scope, `${ crawlerName }-crawler`, {
                name: crawlerName,
                crawlerSecurityConfiguration: this.props.securityConfigurationName,
                role: crawlerConfig.executionRoleArn,
                targets: {
                    catalogTargets: crawlerConfig.targets.catalogTargets,
                    jdbcTargets: crawlerConfig.targets.jdbcTargets,
                    dynamoDbTargets: crawlerConfig.targets.dynamoDbTargets,
                    s3Targets: crawlerConfig.targets.s3Targets
                },
                configuration: JSON.stringify( crawlerConfig.extraConfiguration ),
                databaseName: crawlerConfig.databaseName,
                description: crawlerConfig.description,
                recrawlPolicy: {
                    recrawlBehavior: crawlerConfig.recrawlBehavior
                },
                schedule: crawlerConfig.schedule,
                schemaChangePolicy: crawlerConfig.schemaChangePolicy,
                tablePrefix: crawlerConfig.tablePrefix,
                ...includedClassifiers,
                naming: this.props.naming
            } )

            if ( crawler.name ) {
                const eventRule = this.createCrawlerMonitoringEventRule( `${ crawlerName }-monitor`, [ crawler.name ] )
                DataOpsProjectUtils.createProjectSSMParam( this.scope, this.props.naming, this.props.projectName, `crawler/name/${ crawlerName }`, crawler.name )
                eventRule.addTarget( new SnsTopic( CaefSnsTopic.fromTopicArn( this.scope, `${ crawlerName }-topic`, this.props.notificationTopicArn ) ) );
            }

        } )
    }

    private createCrawlerMonitoringEventRule ( ruleName: string, crawlerNames: string[] ): Rule {
        return EventBridgeHelper.createGlueMonitoringEventRule( this.scope, this.props.naming, ruleName, "Workflow Crawler failure events", {
            crawlerName: crawlerNames,
            state: [ "Failed" ]
        } )
    }
}
