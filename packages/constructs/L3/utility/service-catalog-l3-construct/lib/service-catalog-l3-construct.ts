/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CfnPortfolioPrincipalAssociation, CfnPortfolioPrincipalAssociationProps, Portfolio, PortfolioProps } from 'aws-cdk-lib/aws-servicecatalog';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface PortfolioPropsWithAccess extends PortfolioProps {
    readonly access?: CaefRoleRef[]
}

export interface ServiceCatalogL3ConstructProps extends CaefL3ConstructProps {
    readonly portfolios: PortfolioPropsWithAccess[]
}

export class ServiceCatalogL3Construct extends CaefL3Construct {
    protected readonly props: ServiceCatalogL3ConstructProps


    constructor( scope: Construct, id: string, props: ServiceCatalogL3ConstructProps ) {
        super( scope, id, props )
        this.props = props
        props.portfolios.forEach( portfolioProps => {
            const portfolio = new Portfolio( this, `${ portfolioProps.displayName }-portfolio`, portfolioProps )
            const accessResolved = this.props.roleHelper.resolveRoleRefsWithOrdinals( portfolioProps.access || [], portfolioProps.displayName )
            accessResolved.forEach( access => {
                const accessProps: CfnPortfolioPrincipalAssociationProps = {
                    portfolioId: portfolio.portfolioId,
                    principalArn: access.arn(),
                    principalType: 'IAM'
                }
                new CfnPortfolioPrincipalAssociation( this, `${ portfolioProps.displayName }-${ access.refId() }-access`, accessProps )
            } )
            this.createPortfolioSSMParam( `ssm-portfolio-${ portfolioProps.displayName }-arn`, `portfolio/arn`, portfolio.portfolioArn )
        } )
    }

    private createPortfolioSSMParam ( paramId: string, ssmPath: string, paramValue: string ) {
        console.log( `Creating Portfolio SSM Param: ${ ssmPath }` )
        new StringParameter( this.scope, paramId, {
            parameterName: this.props.naming.ssmPath( ssmPath, true, false ),
            stringValue: paramValue
        } )
    }

}
