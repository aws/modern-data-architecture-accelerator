/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnCrawler, CfnCrawlerProps } from 'aws-cdk-lib/aws-glue';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { TagElement } from '@aws-mdaa/config';

/**
 * Interface representing a compliant Glue Crawler Config
 */
export interface MdaaCfnCrawlerProps extends MdaaConstructProps {
  /**
   * The Amazon Resource Name (ARN) of an IAM role that's used to access customer resources, such as Amazon Simple Storage Service (Amazon S3) data.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-role
   */
  readonly role: string;
  /**
   * A collection of targets to crawl.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-targets
   */
  readonly targets: CfnCrawler.TargetsProperty | IResolvable;
  /**
   * A list of UTF-8 strings that specify the custom classifiers that are associated with the crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-classifiers
   */
  readonly classifiers?: string[];
  /**
   * Crawler configuration information. This versioned JSON string allows users to specify aspects of a crawler's behavior. For more information, see [Configuring a Crawler](https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html) .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-configuration
   */
  readonly configuration?: string;
  /**
   * The name of the `SecurityConfiguration` structure to be used by this crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-crawlersecurityconfiguration
   */
  readonly crawlerSecurityConfiguration: string;
  /**
   * The name of the database in which the crawler's output is stored.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-databasename
   */
  readonly databaseName?: string;
  /**
   * A description of the crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-description
   */
  readonly description?: string;
  /**
   * The name of the crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-name
   */
  readonly name?: string;
  /**
   * A policy that specifies whether to crawl the entire dataset again, or to crawl only folders that were added since the last crawler run.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-recrawlpolicy
   */
  readonly recrawlPolicy?: CfnCrawler.RecrawlPolicyProperty | IResolvable;
  /**
   * For scheduled crawlers, the schedule when the crawler runs.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-schedule
   */
  readonly schedule?: CfnCrawler.ScheduleProperty | IResolvable;
  /**
   * The policy that specifies update and delete behaviors for the crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-schemachangepolicy
   */
  readonly schemaChangePolicy?: CfnCrawler.SchemaChangePolicyProperty | IResolvable;
  /**
   * The prefix added to the names of tables that are created.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-tableprefix
   */
  readonly tablePrefix?: string;
  /**
   * The tags to use with this crawler.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-crawler.html#cfn-glue-crawler-tags
   */
  readonly tags?: TagElement;
}

/**
 * Construct for creating a compliant Glue Crawler
 * Enforces the following:
 * * Security Configuration is set
 */
export class MdaaCfnCrawler extends CfnCrawler {
  private static setProps(props: MdaaCfnCrawlerProps): CfnCrawlerProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name),
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaCfnCrawlerProps) {
    super(scope, id, MdaaCfnCrawler.setProps(props));
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [{ id: 'AwsSolutions-GL1', reason: 'Log encryption configured via SecurityConfiguration' }],
      true,
    );
  }
}
