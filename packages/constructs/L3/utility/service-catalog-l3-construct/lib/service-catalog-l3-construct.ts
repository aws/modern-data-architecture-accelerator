/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  CfnPortfolioPrincipalAssociation,
  CfnPortfolioPrincipalAssociationProps,
  Portfolio,
  PortfolioProps,
} from 'aws-cdk-lib/aws-servicecatalog';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Construct } from 'constructs';

export interface PortfolioPropsWithAccess extends PortfolioProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of MDAA role references for portfolio access control enabling role-based access management and secure service governance. Provides IAM roles that will be granted access to the Service Catalog portfolio for controlled service provisioning and governance.
   *
   * Use cases: Role-based access; Portfolio security; Access control; Service governance
   *
   * AWS: IAM role references for Service Catalog portfolio access control and role-based governance
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; enables role-based portfolio access control
   **/
  readonly access?: MdaaRoleRef[];
}

export interface ServiceCatalogL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Service Catalog portfolios with access control for service governance and role-based access management. Defines the portfolios that will be created with their respective access controls for secure service provisioning and governance.
   *
   * Use cases: Portfolio configuration; Service governance; Access management; service catalog setup
   *
   * AWS: Service Catalog portfolios for service governance and role-based access management
   *
   * Validation: Must be array of valid PortfolioPropsWithAccess; required for Service Catalog portfolio configuration
   *   **/
  readonly portfolios: PortfolioPropsWithAccess[];
}

export class ServiceCatalogL3Construct extends MdaaL3Construct {
  protected readonly props: ServiceCatalogL3ConstructProps;

  constructor(scope: Construct, id: string, props: ServiceCatalogL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    props.portfolios.forEach(portfolioProps => {
      const portfolio = new Portfolio(this, `${portfolioProps.displayName}-portfolio`, portfolioProps);
      const accessResolved = this.props.roleHelper.resolveRoleRefsWithOrdinals(
        portfolioProps.access || [],
        portfolioProps.displayName,
      );
      accessResolved.forEach(access => {
        const accessProps: CfnPortfolioPrincipalAssociationProps = {
          portfolioId: portfolio.portfolioId,
          principalArn: access.arn(),
          principalType: 'IAM',
        };
        new CfnPortfolioPrincipalAssociation(
          this,
          `${portfolioProps.displayName}-${access.refId()}-access`,
          accessProps,
        );
      });
      this.createPortfolioSSMParam(
        `ssm-portfolio-${portfolioProps.displayName}-arn`,
        `portfolio/arn`,
        portfolio.portfolioArn,
      );
    });
  }

  private createPortfolioSSMParam(paramId: string, ssmPath: string, paramValue: string) {
    console.log(`Creating Portfolio SSM Param: ${ssmPath}`);
    new MdaaStringParameter(this.scope, paramId, {
      parameterName: this.props.naming.ssmPath(ssmPath, true, false),
      stringValue: paramValue,
    });
  }
}
