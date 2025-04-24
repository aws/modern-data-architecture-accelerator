# General Guidelines
- **Least-Privilege** : Follow the principals of least privilege while applying permission for specific persona
- **Periodic Permission Review** : Periodicly review the permissions provided to various personas. Be careful while updating *domain-based* policy statements and their impact across multiple data practitioner personas
- Use IAM Policy Conditions if possible 

## MDAA Managed Policy Guidelines
- MDAA Managed Policies are more restrictive compared to AWS managed policies
- `policy-map.yaml` defines all the policy statements mapped to a persona. When user request a role based on MDAA specific persona, associated policies will be attached to the customer generated role
- MDAA managed policies do not provide access to the data asset directly. As a rule of thumb, most MDAA policies do not contain permission which can be restricted to a 'Resource'. Such resource specific permissions should be granted either by *resource-based-policies* or *iam-based-policies* external to default MDAA Managed Policies
- Policy Restrictions: There are two main restrictions MDAA Managed policies try to balance:
    - **Policy-Size**: There is a character limit of `6114` on policy-size, therefore, wherever possible, MDAA Policy statements use *wildcards* appropriately
    - **Policies per Role**: By default, only 10 policies can be associated to a role. You can request to extend this limit to maximum 20 policy per role 


## Directory Strcture
```
roles-l3-construct
    |
    |--policy-map.yaml
    |
    |--persona-based
        |_data-admin-base-policy.yaml
        |_data-<persona>-base-policy.yaml
    |
    |--domain-based
        |_datalake-basic-policy.yaml
        |_dataops-basic-policy.yaml
        |_datascience-basic-policy.yaml
        |_utility-basic-policy.yaml
        |_analytics-basic-policy.yaml
    |
    |--service-based
        |_<aws-service>-basic-policy.yaml


```
## Domain-Based Policy Statements
MDAA Applications are group into various application domains under packages/apps/< domain >. Domain based policies also adhere to the same structure *viz.* `datalake`,`dataops`,`analytics`,`datascience`,`utility`

## Service-Based Policy Statements
Service-based policy statements are written specifically to a given aws service. This is not be the first choice considering 10 policies per role (default) limitation in mind. This may be warranted when certain service permissions cannot be added to existing domain-based policy as they may provide excess permissions to specified persona

## Persona-Based Policy Statements
Contains basic set of permissions, which are not covered in *service-based* or *domain-based* policy statements, but required by specific persona




## Appendix
- Refer Security [Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/IAMBestPracticesAndUseCases.html) in IAM
- A list of all CDK NAG [Rule sets](https://github.com/cdklabs/cdk-nag/blob/main/RULES.md)