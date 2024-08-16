# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [classifiers](#classifiers )                                       | No      | object | No         | In #/definitions/NamedClassifierProps            | Custom Classifiers to create for your crawlers (optional)                                                                                            |
| - [connections](#connections )                                       | No      | object | No         | In #/definitions/NamedConnectionProps            | Connections to use for your Crwalers.                                                                                                                |
| + [dataAdminRoles](#dataAdminRoles )                                 | No      | array  | No         | -                                                | -                                                                                                                                                    |
| - [dataEngineerRoles](#dataEngineerRoles )                           | No      | array  | No         | -                                                | -                                                                                                                                                    |
| - [databases](#databases )                                           | No      | object | No         | In #/definitions/NamedDatabaseProps              | Glue Database definitions to create (required)                                                                                                       |
| - [failureNotifications](#failureNotifications )                     | No      | object | No         | In #/definitions/FailureNotificationsProps       | Failure notifactions for glue jobs .                                                                                                                 |
| - [glueCatalogKmsKeyArn](#glueCatalogKmsKeyArn )                     | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [projectExecutionRoles](#projectExecutionRoles )                   | No      | array  | No         | -                                                | Pre-defined roles to use                                                                                                                             |
| + [s3OutputKmsKeyArn](#s3OutputKmsKeyArn )                           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [securityGroupConfigs](#securityGroupConfigs )                     | No      | object | No         | In #/definitions/NamedSecurityGroupConfigProps   | If specified, project security groups will be created which can be shared<br />by project resources                                                  |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="classifiers"></a>1. Property `root > classifiers`

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                              |
| **Required**              | No                                                                                                                    |
| **Additional properties** | [[Should-conform]](#classifiers_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedClassifierProps                                                                                    |

**Description:** Custom Classifiers to create for your crawlers (optional)

| Property                                 | Pattern | Type   | Deprecated | Definition                       | Title/Description |
| ---------------------------------------- | ------- | ------ | ---------- | -------------------------------- | ----------------- |
| - [](#classifiers_additionalProperties ) | No      | object | No         | In #/definitions/ClassifierProps | -                 |

### <a name="classifiers_additionalProperties"></a>1.1. Property `root > classifiers > ClassifierProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ClassifierProps                           |

| Property                                                              | Pattern | Type             | Deprecated | Definition                             | Title/Description                                                                                                                                           |
| --------------------------------------------------------------------- | ------- | ---------------- | ---------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [classifierType](#classifiers_additionalProperties_classifierType ) | No      | enum (of string) | No         | In #/definitions/ClassifierType        | Custom Classifier type                                                                                                                                      |
| + [configuration](#classifiers_additionalProperties_configuration )   | No      | object           | No         | In #/definitions/ClassifierConfigProps | Custom Classifier configuration to use for the type.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-classifier.html |

#### <a name="classifiers_additionalProperties_classifierType"></a>1.1.1. Property `root > classifiers > additionalProperties > classifierType`

|                |                              |
| -------------- | ---------------------------- |
| **Type**       | `enum (of string)`           |
| **Required**   | Yes                          |
| **Defined in** | #/definitions/ClassifierType |

**Description:** Custom Classifier type

Must be one of:
* "csv"
* "grok"
* "json"
* "xml"

#### <a name="classifiers_additionalProperties_configuration"></a>1.1.2. Property `root > classifiers > additionalProperties > configuration`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ClassifierConfigProps                     |

**Description:** Custom Classifier configuration to use for the type.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-classifier.html

| Property                                                                            | Pattern | Type   | Deprecated | Definition                                            | Title/Description                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| - [csvClassifier](#classifiers_additionalProperties_configuration_csvClassifier )   | No      | object | No         | In #/definitions/ClassifierCsvProps                   | CSV Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-csvclassifier.html   |
| - [grokClassifier](#classifiers_additionalProperties_configuration_grokClassifier ) | No      | object | No         | In #/definitions/CfnClassifier.GrokClassifierProperty | Grok Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-grokclassifier.html |
| - [jsonClassifier](#classifiers_additionalProperties_configuration_jsonClassifier ) | No      | object | No         | In #/definitions/CfnClassifier.JsonClassifierProperty | JSON Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-jsonclassifier.html |
| - [xmlClassifier](#classifiers_additionalProperties_configuration_xmlClassifier )   | No      | object | No         | In #/definitions/CfnClassifier.XMLClassifierProperty  | XML Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-xmlclassifier.html   |

##### <a name="classifiers_additionalProperties_configuration_csvClassifier"></a>1.1.2.1. Property `root > classifiers > additionalProperties > configuration > csvClassifier`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ClassifierCsvProps                        |

**Description:** CSV Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-csvclassifier.html

| Property                                                                                                      | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [allowSingleColumn](#classifiers_additionalProperties_configuration_csvClassifier_allowSingleColumn )       | No      | boolean         | No         | -          | -                 |
| - [containsHeader](#classifiers_additionalProperties_configuration_csvClassifier_containsHeader )             | No      | string          | No         | -          | -                 |
| - [delimiter](#classifiers_additionalProperties_configuration_csvClassifier_delimiter )                       | No      | string          | No         | -          | -                 |
| - [disableValueTrimming](#classifiers_additionalProperties_configuration_csvClassifier_disableValueTrimming ) | No      | boolean         | No         | -          | -                 |
| - [header](#classifiers_additionalProperties_configuration_csvClassifier_header )                             | No      | array of string | No         | -          | -                 |
| - [name](#classifiers_additionalProperties_configuration_csvClassifier_name )                                 | No      | string          | No         | -          | -                 |
| - [quoteSymbol](#classifiers_additionalProperties_configuration_csvClassifier_quoteSymbol )                   | No      | string          | No         | -          | -                 |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_allowSingleColumn"></a>1.1.2.1.1. Property `root > classifiers > additionalProperties > configuration > csvClassifier > allowSingleColumn`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_containsHeader"></a>1.1.2.1.2. Property `root > classifiers > additionalProperties > configuration > csvClassifier > containsHeader`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_delimiter"></a>1.1.2.1.3. Property `root > classifiers > additionalProperties > configuration > csvClassifier > delimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_disableValueTrimming"></a>1.1.2.1.4. Property `root > classifiers > additionalProperties > configuration > csvClassifier > disableValueTrimming`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_header"></a>1.1.2.1.5. Property `root > classifiers > additionalProperties > configuration > csvClassifier > header`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                            | Description |
| ------------------------------------------------------------------------------------------ | ----------- |
| [header items](#classifiers_additionalProperties_configuration_csvClassifier_header_items) | -           |

###### <a name="autogenerated_heading_2"></a>1.1.2.1.5.1. root > classifiers > additionalProperties > configuration > csvClassifier > header > header items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_name"></a>1.1.2.1.6. Property `root > classifiers > additionalProperties > configuration > csvClassifier > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="classifiers_additionalProperties_configuration_csvClassifier_quoteSymbol"></a>1.1.2.1.7. Property `root > classifiers > additionalProperties > configuration > csvClassifier > quoteSymbol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="classifiers_additionalProperties_configuration_grokClassifier"></a>1.1.2.2. Property `root > classifiers > additionalProperties > configuration > grokClassifier`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnClassifier.GrokClassifierProperty      |

**Description:** Grok Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-grokclassifier.html

| Property                                                                                           | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [classification](#classifiers_additionalProperties_configuration_grokClassifier_classification ) | No      | string | No         | -          | An identifier of the data format that the classifier matches, such as Twitter, JSON, Omniture logs, and so on.                                                                                                           |
| - [customPatterns](#classifiers_additionalProperties_configuration_grokClassifier_customPatterns ) | No      | string | No         | -          | Optional custom grok patterns defined by this classifier.<br /><br />For more information, see custom patterns in [Writing Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html) .      |
| + [grokPattern](#classifiers_additionalProperties_configuration_grokClassifier_grokPattern )       | No      | string | No         | -          | The grok pattern applied to a data store by this classifier.<br /><br />For more information, see built-in patterns in [Writing Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html) . |
| - [name](#classifiers_additionalProperties_configuration_grokClassifier_name )                     | No      | string | No         | -          | The name of the classifier.                                                                                                                                                                                              |

###### <a name="classifiers_additionalProperties_configuration_grokClassifier_classification"></a>1.1.2.2.1. Property `root > classifiers > additionalProperties > configuration > grokClassifier > classification`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** An identifier of the data format that the classifier matches, such as Twitter, JSON, Omniture logs, and so on.

###### <a name="classifiers_additionalProperties_configuration_grokClassifier_customPatterns"></a>1.1.2.2.2. Property `root > classifiers > additionalProperties > configuration > grokClassifier > customPatterns`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optional custom grok patterns defined by this classifier.

For more information, see custom patterns in [Writing Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html) .

###### <a name="classifiers_additionalProperties_configuration_grokClassifier_grokPattern"></a>1.1.2.2.3. Property `root > classifiers > additionalProperties > configuration > grokClassifier > grokPattern`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The grok pattern applied to a data store by this classifier.

For more information, see built-in patterns in [Writing Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html) .

###### <a name="classifiers_additionalProperties_configuration_grokClassifier_name"></a>1.1.2.2.4. Property `root > classifiers > additionalProperties > configuration > grokClassifier > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the classifier.

##### <a name="classifiers_additionalProperties_configuration_jsonClassifier"></a>1.1.2.3. Property `root > classifiers > additionalProperties > configuration > jsonClassifier`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnClassifier.JsonClassifierProperty      |

**Description:** JSON Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-jsonclassifier.html

| Property                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [jsonPath](#classifiers_additionalProperties_configuration_jsonClassifier_jsonPath ) | No      | string | No         | -          | A \`JsonPath\` string defining the JSON data for the classifier to classify.<br /><br />AWS Glue supports a subset of \`JsonPath\` , as described in [Writing JsonPath Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html#custom-classifier-json) . |
| - [name](#classifiers_additionalProperties_configuration_jsonClassifier_name )         | No      | string | No         | -          | The name of the classifier.                                                                                                                                                                                                                                                            |

###### <a name="classifiers_additionalProperties_configuration_jsonClassifier_jsonPath"></a>1.1.2.3.1. Property `root > classifiers > additionalProperties > configuration > jsonClassifier > jsonPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A `JsonPath` string defining the JSON data for the classifier to classify.

AWS Glue supports a subset of `JsonPath` , as described in [Writing JsonPath Custom Classifiers](https://docs.aws.amazon.com/glue/latest/dg/custom-classifier.html#custom-classifier-json) .

###### <a name="classifiers_additionalProperties_configuration_jsonClassifier_name"></a>1.1.2.3.2. Property `root > classifiers > additionalProperties > configuration > jsonClassifier > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the classifier.

##### <a name="classifiers_additionalProperties_configuration_xmlClassifier"></a>1.1.2.4. Property `root > classifiers > additionalProperties > configuration > xmlClassifier`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnClassifier.XMLClassifierProperty       |

**Description:** XML Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-xmlclassifier.html

| Property                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [classification](#classifiers_additionalProperties_configuration_xmlClassifier_classification ) | No      | string | No         | -          | An identifier of the data format that the classifier matches.                                                                                                                                                                                                                                                                                                                                |
| - [name](#classifiers_additionalProperties_configuration_xmlClassifier_name )                     | No      | string | No         | -          | The name of the classifier.                                                                                                                                                                                                                                                                                                                                                                  |
| + [rowTag](#classifiers_additionalProperties_configuration_xmlClassifier_rowTag )                 | No      | string | No         | -          | The XML tag designating the element that contains each record in an XML document being parsed.<br /><br />This can't identify a self-closing element (closed by \`/>\` ). An empty row element that contains only attributes can be parsed as long as it ends with a closing tag (for example, \`<row item_a="A" item_b="B"></row>\` is okay, but \`<row item_a="A" item_b="B" />\` is not). |

###### <a name="classifiers_additionalProperties_configuration_xmlClassifier_classification"></a>1.1.2.4.1. Property `root > classifiers > additionalProperties > configuration > xmlClassifier > classification`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** An identifier of the data format that the classifier matches.

###### <a name="classifiers_additionalProperties_configuration_xmlClassifier_name"></a>1.1.2.4.2. Property `root > classifiers > additionalProperties > configuration > xmlClassifier > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the classifier.

###### <a name="classifiers_additionalProperties_configuration_xmlClassifier_rowTag"></a>1.1.2.4.3. Property `root > classifiers > additionalProperties > configuration > xmlClassifier > rowTag`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The XML tag designating the element that contains each record in an XML document being parsed.

This can't identify a self-closing element (closed by `/>` ). An empty row element that contains only attributes can be parsed as long as it ends with a closing tag (for example, `<row item_a="A" item_b="B"></row>` is okay, but `<row item_a="A" item_b="B" />` is not).

## <a name="connections"></a>2. Property `root > connections`

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                              |
| **Required**              | No                                                                                                                    |
| **Additional properties** | [[Should-conform]](#connections_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedConnectionProps                                                                                    |

**Description:** Connections to use for your Crwalers.

| Property                                 | Pattern | Type   | Deprecated | Definition                       | Title/Description |
| ---------------------------------------- | ------- | ------ | ---------- | -------------------------------- | ----------------- |
| - [](#connections_additionalProperties ) | No      | object | No         | In #/definitions/ConnectionProps | -                 |

### <a name="connections_additionalProperties"></a>2.1. Property `root > connections > ConnectionProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ConnectionProps                           |

| Property                                                                                              | Pattern | Type             | Deprecated | Definition                          | Title/Description                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [connectionProperties](#connections_additionalProperties_connectionProperties )                     | No      | object           | No         | -                                   | Connection properties key value pairs.  See: https://docs.aws.amazon.com/glue/latest/webapi/API_Connection.html                                                                |
| + [connectionType](#connections_additionalProperties_connectionType )                                 | No      | enum (of string) | No         | In #/definitions/ConnectionType     | Connection type to create ("JDBC" \| "KAFKA" \| "MONGODB" \| "NETWORK")                                                                                                        |
| - [description](#connections_additionalProperties_description )                                       | No      | string           | No         | -                                   | Connection Description                                                                                                                                                         |
| - [matchCriteria](#connections_additionalProperties_matchCriteria )                                   | No      | array of string  | No         | -                                   | A list of criteria that can be used in selecting this connection.                                                                                                              |
| - [physicalConnectionRequirements](#connections_additionalProperties_physicalConnectionRequirements ) | No      | object           | No         | In #/definitions/ConnectionPhysical | VPC Definition for this to connect to.  see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-connection-physicalconnectionrequirements.html |

#### <a name="connections_additionalProperties_connectionProperties"></a>2.1.1. Property `root > connections > additionalProperties > connectionProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Connection properties key value pairs.  See: https://docs.aws.amazon.com/glue/latest/webapi/API_Connection.html

#### <a name="connections_additionalProperties_connectionType"></a>2.1.2. Property `root > connections > additionalProperties > connectionType`

|                |                              |
| -------------- | ---------------------------- |
| **Type**       | `enum (of string)`           |
| **Required**   | Yes                          |
| **Defined in** | #/definitions/ConnectionType |

**Description:** Connection type to create ("JDBC" | "KAFKA" | "MONGODB" | "NETWORK")

Must be one of:
* "JDBC"
* "KAFKA"
* "MONGODB"
* "NETWORK"

#### <a name="connections_additionalProperties_description"></a>2.1.3. Property `root > connections > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Connection Description

#### <a name="connections_additionalProperties_matchCriteria"></a>2.1.4. Property `root > connections > additionalProperties > matchCriteria`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of criteria that can be used in selecting this connection.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                              | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [matchCriteria items](#connections_additionalProperties_matchCriteria_items) | -           |

##### <a name="autogenerated_heading_3"></a>2.1.4.1. root > connections > additionalProperties > matchCriteria > matchCriteria items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="connections_additionalProperties_physicalConnectionRequirements"></a>2.1.5. Property `root > connections > additionalProperties > physicalConnectionRequirements`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ConnectionPhysical                        |

**Description:** VPC Definition for this to connect to.  see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-connection-physicalconnectionrequirements.html

| Property                                                                                                                   | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| - [availabilityZone](#connections_additionalProperties_physicalConnectionRequirements_availabilityZone )                   | No      | string          | No         | -          | Availability zone to use (eg test-regiona)                                                                           |
| - [projectSecurityGroupNames](#connections_additionalProperties_physicalConnectionRequirements_projectSecurityGroupNames ) | No      | array of string | No         | -          | List of names of security groups generated within the project config                                                 |
| - [securityGroupIdList](#connections_additionalProperties_physicalConnectionRequirements_securityGroupIdList )             | No      | array of string | No         | -          | List of security groups to use when connecting to the VPC.  Assure they are in the VPC matching the SecurityGroupIds |
| - [subnetId](#connections_additionalProperties_physicalConnectionRequirements_subnetId )                                   | No      | string          | No         | -          | Subnet ID within the Availability Zone chosen above.                                                                 |

##### <a name="connections_additionalProperties_physicalConnectionRequirements_availabilityZone"></a>2.1.5.1. Property `root > connections > additionalProperties > physicalConnectionRequirements > availabilityZone`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Availability zone to use (eg test-regiona)

##### <a name="connections_additionalProperties_physicalConnectionRequirements_projectSecurityGroupNames"></a>2.1.5.2. Property `root > connections > additionalProperties > physicalConnectionRequirements > projectSecurityGroupNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of names of security groups generated within the project config

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                     | Description |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [projectSecurityGroupNames items](#connections_additionalProperties_physicalConnectionRequirements_projectSecurityGroupNames_items) | -           |

###### <a name="autogenerated_heading_4"></a>2.1.5.2.1. root > connections > additionalProperties > physicalConnectionRequirements > projectSecurityGroupNames > projectSecurityGroupNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="connections_additionalProperties_physicalConnectionRequirements_securityGroupIdList"></a>2.1.5.3. Property `root > connections > additionalProperties > physicalConnectionRequirements > securityGroupIdList`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of security groups to use when connecting to the VPC.  Assure they are in the VPC matching the SecurityGroupIds

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                         | Description |
| ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| [securityGroupIdList items](#connections_additionalProperties_physicalConnectionRequirements_securityGroupIdList_items) | -           |

###### <a name="autogenerated_heading_5"></a>2.1.5.3.1. root > connections > additionalProperties > physicalConnectionRequirements > securityGroupIdList > securityGroupIdList items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="connections_additionalProperties_physicalConnectionRequirements_subnetId"></a>2.1.5.4. Property `root > connections > additionalProperties > physicalConnectionRequirements > subnetId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Subnet ID within the Availability Zone chosen above.

## <a name="dataAdminRoles"></a>3. Property `root > dataAdminRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be      | Description                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#dataAdminRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_6"></a>3.1. root > dataAdminRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                        | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ----------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#dataAdminRoles_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#dataAdminRoles_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#dataAdminRoles_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#dataAdminRoles_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#dataAdminRoles_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#dataAdminRoles_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

#### <a name="dataAdminRoles_items_arn"></a>3.1.1. Property `root > dataAdminRoles > dataAdminRoles items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

#### <a name="dataAdminRoles_items_id"></a>3.1.2. Property `root > dataAdminRoles > dataAdminRoles items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

#### <a name="dataAdminRoles_items_immutable"></a>3.1.3. Property `root > dataAdminRoles > dataAdminRoles items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

#### <a name="dataAdminRoles_items_name"></a>3.1.4. Property `root > dataAdminRoles > dataAdminRoles items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

#### <a name="dataAdminRoles_items_refId"></a>3.1.5. Property `root > dataAdminRoles > dataAdminRoles items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

#### <a name="dataAdminRoles_items_sso"></a>3.1.6. Property `root > dataAdminRoles > dataAdminRoles items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

## <a name="dataEngineerRoles"></a>4. Property `root > dataEngineerRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be         | Description                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#dataEngineerRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_7"></a>4.1. root > dataEngineerRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

## <a name="databases"></a>5. Property `root > databases`

|                           |                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                            |
| **Required**              | No                                                                                                                  |
| **Additional properties** | [[Should-conform]](#databases_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedDatabaseProps                                                                                    |

**Description:** Glue Database definitions to create (required)

| Property                               | Pattern | Type   | Deprecated | Definition                     | Title/Description |
| -------------------------------------- | ------- | ------ | ---------- | ------------------------------ | ----------------- |
| - [](#databases_additionalProperties ) | No      | object | No         | In #/definitions/DatabaseProps | -                 |

### <a name="databases_additionalProperties"></a>5.1. Property `root > databases > DatabaseProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DatabaseProps                             |

| Property                                                                    | Pattern | Type   | Deprecated | Definition                                  | Title/Description                                               |
| --------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------- | --------------------------------------------------------------- |
| + [description](#databases_additionalProperties_description )               | No      | string | No         | -                                           | General description of the database                             |
| - [lakeFormation](#databases_additionalProperties_lakeFormation )           | No      | object | No         | In #/definitions/DatabaseLakeFormationProps | -                                                               |
| - [locationBucketName](#databases_additionalProperties_locationBucketName ) | No      | string | No         | -                                           | S3 Bucket under which all data for this database will be stored |
| - [locationPrefix](#databases_additionalProperties_locationPrefix )         | No      | string | No         | -                                           | S3 prefix under which all data for this database will be stored |

#### <a name="databases_additionalProperties_description"></a>5.1.1. Property `root > databases > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** General description of the database

#### <a name="databases_additionalProperties_lakeFormation"></a>5.1.2. Property `root > databases > additionalProperties > lakeFormation`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DatabaseLakeFormationProps                |

| Property                                                                                                                                        | Pattern | Type            | Deprecated | Definition                               | Title/Description                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| - [createCrossAccountResourceLinkAccounts](#databases_additionalProperties_lakeFormation_createCrossAccountResourceLinkAccounts )               | No      | array of string | No         | -                                        | List of account numbers for which cross account Resource Links will be created.<br />Additional stacks will be created for each account.    |
| - [createCrossAccountResourceLinkName](#databases_additionalProperties_lakeFormation_createCrossAccountResourceLinkName )                       | No      | string          | No         | -                                        | Name of the resource link to be created<br />If not specified, defaults to the database name                                                |
| - [createReadGrantsForDataEngineerRoles](#databases_additionalProperties_lakeFormation_createReadGrantsForDataEngineerRoles )                   | No      | boolean         | No         | -                                        | If true (default: false), will automatically add read LF grants for data engineer roles<br /> to database                                   |
| - [createReadWriteGrantsForProjectExecutionRoles](#databases_additionalProperties_lakeFormation_createReadWriteGrantsForProjectExecutionRoles ) | No      | boolean         | No         | -                                        | If true (default: false), will automatically add read/write LF grants for project execution role<br /> to databases and their s3 locations. |
| - [createSuperGrantsForDataAdminRoles](#databases_additionalProperties_lakeFormation_createSuperGrantsForDataAdminRoles )                       | No      | boolean         | No         | -                                        | If true (default: false), will automatically add read/write/super LF grants for data admin roles<br /> to database                          |
| - [grants](#databases_additionalProperties_lakeFormation_grants )                                                                               | No      | object          | No         | In #/definitions/NamedDatabaseGrantProps | LF Grants to be added to the database                                                                                                       |

##### <a name="databases_additionalProperties_lakeFormation_createCrossAccountResourceLinkAccounts"></a>5.1.2.1. Property `root > databases > additionalProperties > lakeFormation > createCrossAccountResourceLinkAccounts`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of account numbers for which cross account Resource Links will be created.
Additional stacks will be created for each account.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                            | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [createCrossAccountResourceLinkAccounts items](#databases_additionalProperties_lakeFormation_createCrossAccountResourceLinkAccounts_items) | -           |

###### <a name="autogenerated_heading_8"></a>5.1.2.1.1. root > databases > additionalProperties > lakeFormation > createCrossAccountResourceLinkAccounts > createCrossAccountResourceLinkAccounts items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="databases_additionalProperties_lakeFormation_createCrossAccountResourceLinkName"></a>5.1.2.2. Property `root > databases > additionalProperties > lakeFormation > createCrossAccountResourceLinkName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Name of the resource link to be created
If not specified, defaults to the database name

##### <a name="databases_additionalProperties_lakeFormation_createReadGrantsForDataEngineerRoles"></a>5.1.2.3. Property `root > databases > additionalProperties > lakeFormation > createReadGrantsForDataEngineerRoles`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default: false), will automatically add read LF grants for data engineer roles
 to database

##### <a name="databases_additionalProperties_lakeFormation_createReadWriteGrantsForProjectExecutionRoles"></a>5.1.2.4. Property `root > databases > additionalProperties > lakeFormation > createReadWriteGrantsForProjectExecutionRoles`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default: false), will automatically add read/write LF grants for project execution role
 to databases and their s3 locations.

##### <a name="databases_additionalProperties_lakeFormation_createSuperGrantsForDataAdminRoles"></a>5.1.2.5. Property `root > databases > additionalProperties > lakeFormation > createSuperGrantsForDataAdminRoles`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default: false), will automatically add read/write/super LF grants for data admin roles
 to database

##### <a name="databases_additionalProperties_lakeFormation_grants"></a>5.1.2.6. Property `root > databases > additionalProperties > lakeFormation > grants`

|                           |                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                      |
| **Required**              | No                                                                                                                                                            |
| **Additional properties** | [[Should-conform]](#databases_additionalProperties_lakeFormation_grants_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedDatabaseGrantProps                                                                                                                         |

**Description:** LF Grants to be added to the database

| Property                                                                         | Pattern | Type   | Deprecated | Definition                          | Title/Description |
| -------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------- | ----------------- |
| - [](#databases_additionalProperties_lakeFormation_grants_additionalProperties ) | No      | object | No         | In #/definitions/DatabaseGrantProps | -                 |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties"></a>5.1.2.6.1. Property `root > databases > additionalProperties > lakeFormation > grants > DatabaseGrantProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DatabaseGrantProps                        |

| Property                                                                                                                | Pattern | Type             | Deprecated | Definition                              | Title/Description                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| - [databasePermissions](#databases_additionalProperties_lakeFormation_grants_additionalProperties_databasePermissions ) | No      | enum (of string) | No         | -                                       | Permissions to Grant on database.  Must be 'read', 'write', or 'super'. Defaults to 'read'.                       |
| - [principalArns](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principalArns )             | No      | object           | No         | In #/definitions/NamedPrincipalArnProps | Mapping of principal names to arns. Can be used as short hand for principals                                      |
| - [principals](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals )                   | No      | object           | No         | In #/definitions/NamedPrincipalProps    | Array of strings representing principals to grant permissions to.  These must exist in the 'principals:' section. |
| - [tablePermissions](#databases_additionalProperties_lakeFormation_grants_additionalProperties_tablePermissions )       | No      | enum (of string) | No         | -                                       | Permissions to Grant on tables.  Must be 'read', 'write', or 'super'. Defaults to 'read'.                         |
| - [tables](#databases_additionalProperties_lakeFormation_grants_additionalProperties_tables )                           | No      | array of string  | No         | -                                       | List of tables for which to create grants. Tables must exist before grants can be created.                        |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_databasePermissions"></a>5.1.2.6.1.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > databasePermissions`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** Permissions to Grant on database.  Must be 'read', 'write', or 'super'. Defaults to 'read'.

Must be one of:
* "read"
* "super"
* "write"

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principalArns"></a>5.1.2.6.1.2. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principalArns`

|                           |                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                         |
| **Required**              | No                                                                                                                                                                                               |
| **Additional properties** | [[Should-conform]](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principalArns_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedPrincipalArnProps                                                                                                                                                             |

**Description:** Mapping of principal names to arns. Can be used as short hand for principals

| Property                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principalArns_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principalArns_additionalProperties"></a>5.1.2.6.1.2.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principalArns > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals"></a>5.1.2.6.1.3. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals`

|                           |                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                            |
| **Additional properties** | [[Should-conform]](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedPrincipalProps                                                                                                                                                             |

**Description:** Array of strings representing principals to grant permissions to.  These must exist in the 'principals:' section.

| Property                                                                                                         | Pattern | Type   | Deprecated | Definition                      | Title/Description |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------- | ----------------- |
| - [](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties ) | No      | object | No         | In #/definitions/PrincipalProps | -                 |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties"></a>5.1.2.6.1.3.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > PrincipalProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/PrincipalProps                            |

| Property                                                                                                                                                    | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| - [account](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_account )                             | No      | string      | No         | -          | Optionally, the principal account can be specified for cases where the account cannot be <br />determined from the role arn |
| - [federatedGroup](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federatedGroup )               | No      | string      | No         | -          | Federated group name for the grant.                                                                                         |
| - [federatedUser](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federatedUser )                 | No      | string      | No         | -          | Federated user name for the grant.                                                                                          |
| - [federationProviderArn](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federationProviderArn ) | No      | string      | No         | -          | Arn of the IAM Federation provider that Active Directory uses to federate into the environment.                             |
| - [role](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role )                                   | No      | Combination | No         | -          | Arn of an IAM principal for the grant.                                                                                      |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_account"></a>5.1.2.6.1.3.1.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > account`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optionally, the principal account can be specified for cases where the account cannot be 
determined from the role arn

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federatedGroup"></a>5.1.2.6.1.3.1.2. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > federatedGroup`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Federated group name for the grant.

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federatedUser"></a>5.1.2.6.1.3.1.3. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > federatedUser`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Federated user name for the grant.

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_federationProviderArn"></a>5.1.2.6.1.3.1.4. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > federationProviderArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Arn of the IAM Federation provider that Active Directory uses to federate into the environment.

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role"></a>5.1.2.6.1.3.1.5. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Arn of an IAM principal for the grant.

| Any of(Option)                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- |
| [MdaaRoleRef](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i0)        |
| [MdaaResolvableRole](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1) |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i0"></a>5.1.2.6.1.3.1.5.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > MdaaRoleRef`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1"></a>5.1.2.6.1.3.1.5.2. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > MdaaResolvableRole`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaResolvableRole                        |

**Description:** A role for which Role ID, Arn, or Name can be resolved using a custom resource. If one of these
properties is requested of the object and is not already populated, then a custom Cfn resource
will be created to facilitate the lookup.

| Property                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [getCr](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_getCr )           | No      | object | No         | -          | -                 |
| - [roleCr](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleCr )         | No      | object | No         | -          | -                 |
| + [roleHelper](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleHelper ) | No      | object | No         | -          | -                 |
| + [roleRef](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleRef )       | No      | object | No         | -          | -                 |
| + [scope](#databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_scope )           | No      | object | No         | -          | -                 |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_getCr"></a>5.1.2.6.1.3.1.5.2.1. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > item 1 > getCr`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleCr"></a>5.1.2.6.1.3.1.5.2.2. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > item 1 > roleCr`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleHelper"></a>5.1.2.6.1.3.1.5.2.3. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > item 1 > roleHelper`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_roleRef"></a>5.1.2.6.1.3.1.5.2.4. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > item 1 > roleRef`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_principals_additionalProperties_role_anyOf_i1_scope"></a>5.1.2.6.1.3.1.5.2.5. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > principals > additionalProperties > role > anyOf > item 1 > scope`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_tablePermissions"></a>5.1.2.6.1.4. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > tablePermissions`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** Permissions to Grant on tables.  Must be 'read', 'write', or 'super'. Defaults to 'read'.

Must be one of:
* "read"
* "super"
* "write"

###### <a name="databases_additionalProperties_lakeFormation_grants_additionalProperties_tables"></a>5.1.2.6.1.5. Property `root > databases > additionalProperties > lakeFormation > grants > additionalProperties > tables`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of tables for which to create grants. Tables must exist before grants can be created.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                        | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| [tables items](#databases_additionalProperties_lakeFormation_grants_additionalProperties_tables_items) | -           |

###### <a name="autogenerated_heading_9"></a>5.1.2.6.1.5.1. root > databases > additionalProperties > lakeFormation > grants > additionalProperties > tables > tables items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="databases_additionalProperties_locationBucketName"></a>5.1.3. Property `root > databases > additionalProperties > locationBucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** S3 Bucket under which all data for this database will be stored

#### <a name="databases_additionalProperties_locationPrefix"></a>5.1.4. Property `root > databases > additionalProperties > locationPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** S3 prefix under which all data for this database will be stored

## <a name="failureNotifications"></a>6. Property `root > failureNotifications`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/FailureNotificationsProps                 |

**Description:** Failure notifactions for glue jobs .

| Property                                | Pattern | Type            | Deprecated | Definition | Title/Description |
| --------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [email](#failureNotifications_email ) | No      | array of string | No         | -          | -                 |

### <a name="failureNotifications_email"></a>6.1. Property `root > failureNotifications > email`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                  | Description |
| ------------------------------------------------ | ----------- |
| [email items](#failureNotifications_email_items) | -           |

#### <a name="autogenerated_heading_10"></a>6.1.1. root > failureNotifications > email > email items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="glueCatalogKmsKeyArn"></a>7. Property `root > glueCatalogKmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="nag_suppressions"></a>8. Property `root > nag_suppressions`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressions                       |

**Description:** Nag suppressions

| Property                                | Pattern | Type  | Deprecated | Definition | Title/Description |
| --------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| + [by_path](#nag_suppressions_by_path ) | No      | array | No         | -          | -                 |

### <a name="nag_suppressions_by_path"></a>8.1. Property `root > nag_suppressions > by_path`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                             | Description |
| ----------------------------------------------------------- | ----------- |
| [MdaaNagSuppressionByPath](#nag_suppressions_by_path_items) | -           |

#### <a name="autogenerated_heading_11"></a>8.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressionByPath                  |

| Property                                                        | Pattern | Type            | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [path](#nag_suppressions_by_path_items_path )                 | No      | string          | No         | -          | -                 |
| + [suppressions](#nag_suppressions_by_path_items_suppressions ) | No      | array of object | No         | -          | -                 |

##### <a name="nag_suppressions_by_path_items_path"></a>8.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>8.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [suppressions items](#nag_suppressions_by_path_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_12"></a>8.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>8.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>8.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectExecutionRoles"></a>9. Property `root > projectExecutionRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Pre-defined roles to use

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be             | Description                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#projectExecutionRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_13"></a>9.1. root > projectExecutionRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

## <a name="s3OutputKmsKeyArn"></a>10. Property `root > s3OutputKmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityGroupConfigs"></a>11. Property `root > securityGroupConfigs`

|                           |                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                       |
| **Required**              | No                                                                                                                             |
| **Additional properties** | [[Should-conform]](#securityGroupConfigs_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedSecurityGroupConfigProps                                                                                    |

**Description:** If specified, project security groups will be created which can be shared
by project resources

| Property                                          | Pattern | Type   | Deprecated | Definition                                | Title/Description |
| ------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------- | ----------------- |
| - [](#securityGroupConfigs_additionalProperties ) | No      | object | No         | In #/definitions/SecurityGroupConfigProps | -                 |

### <a name="securityGroupConfigs_additionalProperties"></a>11.1. Property `root > securityGroupConfigs > SecurityGroupConfigProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SecurityGroupConfigProps                  |

| Property                                                                                           | Pattern | Type   | Deprecated | Definition                                  | Title/Description                                      |
| -------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------- | ------------------------------------------------------ |
| - [securityGroupEgressRules](#securityGroupConfigs_additionalProperties_securityGroupEgressRules ) | No      | object | No         | In #/definitions/MdaaSecurityGroupRuleProps | List of egress rules to be added to the function SG    |
| + [vpcId](#securityGroupConfigs_additionalProperties_vpcId )                                       | No      | string | No         | -                                           | The ID of the VPC on which the Lambda will be deployed |

#### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules"></a>11.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** List of egress rules to be added to the function SG

| Property                                                                                        | Pattern | Type  | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg )                 | No      | array | No         | -          | -                 |

##### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4"></a>11.1.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                | Description |
| ---------------------------------------------------------------------------------------------- | ----------- |
| [MdaaCidrPeer](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items) | -           |

###### <a name="autogenerated_heading_14"></a>11.1.1.1.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_cidr"></a>11.1.1.1.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_description"></a>11.1.1.1.1.2. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_port"></a>11.1.1.1.1.3. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_protocol"></a>11.1.1.1.1.4. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions"></a>11.1.1.1.1.5. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                          | Description |
| ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [NagSuppressionProps](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_15"></a>11.1.1.1.1.5.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_id"></a>11.1.1.1.1.5.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_reason"></a>11.1.1.1.1.5.1.2. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_toPort"></a>11.1.1.1.1.6. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList"></a>11.1.1.2. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                            | Description |
| ---------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaPrefixListPeer](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items) | -           |

###### <a name="autogenerated_heading_16"></a>11.1.1.2.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_description"></a>11.1.1.2.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_port"></a>11.1.1.2.1.2. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_prefixList"></a>11.1.1.2.1.3. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_protocol"></a>11.1.1.2.1.4. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions"></a>11.1.1.2.1.5. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                | Description |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [NagSuppressionProps](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_17"></a>11.1.1.2.1.5.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                               |
| **Same definition as**    | [securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_prefixList_items_toPort"></a>11.1.1.2.1.6. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg"></a>11.1.1.3. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                       | Description |
| ----------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaSecurityGroupPeer](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items) | -           |

###### <a name="autogenerated_heading_18"></a>11.1.1.3.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_description"></a>11.1.1.3.1.1. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_port"></a>11.1.1.3.1.2. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_protocol"></a>11.1.1.3.1.3. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_sgId"></a>11.1.1.3.1.4. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_suppressions"></a>11.1.1.3.1.5. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                        | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_19"></a>11.1.1.3.1.5.1. root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                               |
| **Same definition as**    | [securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items](#securityGroupConfigs_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="securityGroupConfigs_additionalProperties_securityGroupEgressRules_sg_items_toPort"></a>11.1.1.3.1.6. Property `root > securityGroupConfigs > additionalProperties > securityGroupEgressRules > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="securityGroupConfigs_additionalProperties_vpcId"></a>11.1.2. Property `root > securityGroupConfigs > additionalProperties > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the VPC on which the Lambda will be deployed

## <a name="service_catalog_product_config"></a>12. Property `root > service_catalog_product_config`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogProductConfig           |

**Description:** Service Catalog Config
If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment

| Property                                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [launch_role_name](#service_catalog_product_config_launch_role_name ) | No      | string | No         | -          | -                 |
| + [name](#service_catalog_product_config_name )                         | No      | string | No         | -          | -                 |
| + [owner](#service_catalog_product_config_owner )                       | No      | string | No         | -          | -                 |
| - [parameters](#service_catalog_product_config_parameters )             | No      | object | No         | -          | -                 |
| + [portfolio_arn](#service_catalog_product_config_portfolio_arn )       | No      | string | No         | -          | -                 |

### <a name="service_catalog_product_config_launch_role_name"></a>12.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>12.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>12.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>12.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>12.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogParameterConfig         |

| Property                                                                                      | Pattern | Type   | Deprecated | Definition                                          | Title/Description |
| --------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------------- | ----------------- |
| - [constraints](#service_catalog_product_config_parameters_additionalProperties_constraints ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintConfig | -                 |
| + [props](#service_catalog_product_config_parameters_additionalProperties_props )             | No      | object | No         | In #/definitions/CfnParameterProps                  | -                 |

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>12.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintConfig        |

| Property                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_description ) | No      | string | No         | -          | -                 |
| + [rules](#service_catalog_product_config_parameters_additionalProperties_constraints_rules )             | No      | object | No         | -          | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>12.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>12.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>12.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleConfig    |

| Property                                                                                                                           | Pattern | Type   | Deprecated | Definition                                                         | Title/Description |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------ | ----------------- |
| + [assertions](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions ) | No      | array  | No         | -                                                                  | -                 |
| + [condition](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition )   | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>12.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                            | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaServiceCatalogConstraintRuleAssertionConfig](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items) | -           |

###### <a name="autogenerated_heading_20"></a>12.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

|                           |                                                               |
| ------------------------- | ------------------------------------------------------------- |
| **Type**                  | `object`                                                      |
| **Required**              | No                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")       |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleAssertionConfig |

| Property                                                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [assert](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert )           | No      | string | No         | -          | -                 |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description ) | No      | string | No         | -          | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>12.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>12.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>12.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>12.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnParameterProps                         |

| Property                                                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [allowedPattern](#service_catalog_product_config_parameters_additionalProperties_props_allowedPattern )               | No      | string          | No         | -          | A regular expression that represents the patterns to allow for String types.                                                                                                                                                                                              |
| - [allowedValues](#service_catalog_product_config_parameters_additionalProperties_props_allowedValues )                 | No      | array of string | No         | -          | An array containing the list of values allowed for the parameter.                                                                                                                                                                                                         |
| - [constraintDescription](#service_catalog_product_config_parameters_additionalProperties_props_constraintDescription ) | No      | string          | No         | -          | A string that explains a constraint when the constraint is violated.<br />For example, without a constraint description, a parameter that has an allowed<br />pattern of [A-Za-z0-9]+ displays the following error message when the user specifies<br />an invalid value: |
| - [default](#service_catalog_product_config_parameters_additionalProperties_props_default )                             | No      | object          | No         | -          | A value of the appropriate type for the template to use if no value is specified<br />when a stack is created. If you define constraints for the parameter, you must specify<br />a value that adheres to those constraints.                                              |
| - [description](#service_catalog_product_config_parameters_additionalProperties_props_description )                     | No      | string          | No         | -          | A string of up to 4000 characters that describes the parameter.                                                                                                                                                                                                           |
| - [maxLength](#service_catalog_product_config_parameters_additionalProperties_props_maxLength )                         | No      | number          | No         | -          | An integer value that determines the largest number of characters you want to allow for String types.                                                                                                                                                                     |
| - [maxValue](#service_catalog_product_config_parameters_additionalProperties_props_maxValue )                           | No      | number          | No         | -          | A numeric value that determines the largest numeric value you want to allow for Number types.                                                                                                                                                                             |
| - [minLength](#service_catalog_product_config_parameters_additionalProperties_props_minLength )                         | No      | number          | No         | -          | An integer value that determines the smallest number of characters you want to allow for String types.                                                                                                                                                                    |
| - [minValue](#service_catalog_product_config_parameters_additionalProperties_props_minValue )                           | No      | number          | No         | -          | A numeric value that determines the smallest numeric value you want to allow for Number types.                                                                                                                                                                            |
| - [noEcho](#service_catalog_product_config_parameters_additionalProperties_props_noEcho )                               | No      | boolean         | No         | -          | Whether to mask the parameter value when anyone makes a call that describes the stack.<br />If you set the value to \`\`true\`\`, the parameter value is masked with asterisks (\`\`*****\`\`).                                                                           |
| - [type](#service_catalog_product_config_parameters_additionalProperties_props_type )                                   | No      | string          | No         | -          | The data type for the parameter (DataType).                                                                                                                                                                                                                               |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>12.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>12.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| **Type**     | `array of string`                                     |
| **Required** | No                                                    |
| **Default**  | `"- No constraints on values allowed for parameter."` |

**Description:** An array containing the list of values allowed for the parameter.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                  | Description |
| ---------------------------------------------------------------------------------------------------------------- | ----------- |
| [allowedValues items](#service_catalog_product_config_parameters_additionalProperties_props_allowedValues_items) | -           |

###### <a name="autogenerated_heading_21"></a>12.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>12.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>12.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>12.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>12.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>12.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>12.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>12.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>12.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>12.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>12.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:34 -0400
