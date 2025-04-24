# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [datasets](#datasets )                                             | No      | object | No         | -                                                | -                                                                                                                                                    |
| + [deploymentRole](#deploymentRole )                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [jobs](#jobs )                                                     | No      | object | No         | -                                                | -                                                                                                                                                    |
| + [kmsArn](#kmsArn )                                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [projectBucket](#projectBucket )                                   | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectName](#projectName )                                       | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectTopicArn](#projectTopicArn )                               | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [recipes](#recipes )                                               | No      | object | No         | -                                                | -                                                                                                                                                    |
| + [securityConfigurationName](#securityConfigurationName )           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="datasets"></a>1. Property `root > datasets`

|                           |                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                           |
| **Required**              | No                                                                                                                 |
| **Additional properties** | [[Should-conform]](#datasets_additionalProperties "Each additional property must conform to the following schema") |

| Property                              | Pattern | Type   | Deprecated | Definition                    | Title/Description |
| ------------------------------------- | ------- | ------ | ---------- | ----------------------------- | ----------------- |
| - [](#datasets_additionalProperties ) | No      | object | No         | In #/definitions/DatasetProps | -                 |

### <a name="datasets_additionalProperties"></a>1.1. Property `root > datasets > DatasetProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DatasetProps                              |

| Property                                                         | Pattern | Type        | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ----------------- |
| - [format](#datasets_additionalProperties_format )               | No      | string      | No         | -          | -                 |
| - [formatOptions](#datasets_additionalProperties_formatOptions ) | No      | Combination | No         | -          | -                 |
| + [input](#datasets_additionalProperties_input )                 | No      | Combination | No         | -          | -                 |
| - [pathOptions](#datasets_additionalProperties_pathOptions )     | No      | Combination | No         | -          | -                 |

#### <a name="datasets_additionalProperties_format"></a>1.1.1. Property `root > datasets > additionalProperties > format`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="datasets_additionalProperties_formatOptions"></a>1.1.2. Property `root > datasets > additionalProperties > formatOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                            |
| ----------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i0)                      |
| [CfnDataset.FormatOptionsProperty](#datasets_additionalProperties_formatOptions_anyOf_i1) |

##### <a name="datasets_additionalProperties_formatOptions_anyOf_i0"></a>1.1.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > IResolvable`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IResolvable                               |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

| Property                                                                                | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [creationStack](#datasets_additionalProperties_formatOptions_anyOf_i0_creationStack ) | No      | array of string  | No         | -          | The creation stack of this resolvable which will be appended to errors<br />thrown during resolution.<br /><br />This may return an array with a single informational element indicating how<br />to get this property populated, if it was skipped for performance reasons. |
| - [typeHint](#datasets_additionalProperties_formatOptions_anyOf_i0_typeHint )           | No      | enum (of string) | No         | -          | The type that this token will likely resolve to.                                                                                                                                                                                                                             |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i0_creationStack"></a>1.1.2.1.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 0 > creationStack`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The creation stack of this resolvable which will be appended to errors
thrown during resolution.

This may return an array with a single informational element indicating how
to get this property populated, if it was skipped for performance reasons.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                  | Description |
| ------------------------------------------------------------------------------------------------ | ----------- |
| [creationStack items](#datasets_additionalProperties_formatOptions_anyOf_i0_creationStack_items) | -           |

###### <a name="autogenerated_heading_2"></a>1.1.2.1.1.1. root > datasets > additionalProperties > formatOptions > anyOf > item 0 > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i0_typeHint"></a>1.1.2.1.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 0 > typeHint`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type that this token will likely resolve to.

Must be one of:
* "number"
* "string"
* "string-list"

##### <a name="datasets_additionalProperties_formatOptions_anyOf_i1"></a>1.1.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > CfnDataset.FormatOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.FormatOptionsProperty          |

**Description:** Represents a set of options that define the structure of either comma-separated value (CSV), Excel, or JSON input.

| Property                                                                | Pattern | Type        | Deprecated | Definition | Title/Description                                                     |
| ----------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | --------------------------------------------------------------------- |
| - [csv](#datasets_additionalProperties_formatOptions_anyOf_i1_csv )     | No      | Combination | No         | -          | Options that define how CSV input is to be interpreted by DataBrew.   |
| - [excel](#datasets_additionalProperties_formatOptions_anyOf_i1_excel ) | No      | Combination | No         | -          | Options that define how Excel input is to be interpreted by DataBrew. |
| - [json](#datasets_additionalProperties_formatOptions_anyOf_i1_json )   | No      | Combination | No         | -          | Options that define how JSON input is to be interpreted by DataBrew.  |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv"></a>1.1.2.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Options that define how CSV input is to be interpreted by DataBrew.

| Any of(Option)                                                                                      |
| --------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i0)                   |
| [CfnDataset.CsvOptionsProperty](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1) |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i0"></a>1.1.2.2.1.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1"></a>1.1.2.2.1.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > CfnDataset.CsvOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.CsvOptionsProperty             |

**Description:** Represents a set of options that define how DataBrew will read a comma-separated value (CSV) file when creating a dataset from that file.

| Property                                                                                     | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                        |
| -------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [delimiter](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_delimiter ) | No      | string      | No         | -          | A single character that specifies the delimiter being used in the CSV file.                                                                              |
| - [headerRow](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow ) | No      | Combination | No         | -          | A variable that specifies whether the first row in the file is parsed as the header.<br /><br />If this value is false, column names are auto-generated. |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_delimiter"></a>1.1.2.2.1.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > item 1 > delimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A single character that specifies the delimiter being used in the CSV file.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow"></a>1.1.2.2.1.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > item 1 > headerRow`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A variable that specifies whether the first row in the file is parsed as the header.

If this value is false, column names are auto-generated.

| Any of(Option)                                                                                       |
| ---------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow_anyOf_i0) |
| [item 1](#datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow_anyOf_i1)      |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow_anyOf_i0"></a>1.1.2.2.1.2.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > item 1 > headerRow > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_csv_anyOf_i1_headerRow_anyOf_i1"></a>1.1.2.2.1.2.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > csv > anyOf > item 1 > headerRow > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel"></a>1.1.2.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Options that define how Excel input is to be interpreted by DataBrew.

| Any of(Option)                                                                                          |
| ------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i0)                     |
| [CfnDataset.ExcelOptionsProperty](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1) |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i0"></a>1.1.2.2.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1"></a>1.1.2.2.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > CfnDataset.ExcelOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.ExcelOptionsProperty           |

**Description:** Represents a set of options that define how DataBrew will interpret a Microsoft Excel file when creating a dataset from that file.

| Property                                                                                             | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [headerRow](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow )       | No      | Combination     | No         | -          | A variable that specifies whether the first row in the file is parsed as the header.<br /><br />If this value is false, column names are auto-generated. |
| - [sheetIndexes](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes ) | No      | Combination     | No         | -          | One or more sheet numbers in the Excel file that will be included in the dataset.                                                                        |
| - [sheetNames](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetNames )     | No      | array of string | No         | -          | One or more named sheets in the Excel file that will be included in the dataset.                                                                         |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow"></a>1.1.2.2.2.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > headerRow`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A variable that specifies whether the first row in the file is parsed as the header.

If this value is false, column names are auto-generated.

| Any of(Option)                                                                                         |
| ------------------------------------------------------------------------------------------------------ |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow_anyOf_i0) |
| [item 1](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow_anyOf_i1)      |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow_anyOf_i0"></a>1.1.2.2.2.2.1.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > headerRow > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_headerRow_anyOf_i1"></a>1.1.2.2.2.2.1.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > headerRow > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes"></a>1.1.2.2.2.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetIndexes`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** One or more sheet numbers in the Excel file that will be included in the dataset.

| Any of(Option)                                                                                            |
| --------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes_anyOf_i0) |
| [item 1](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes_anyOf_i1)      |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes_anyOf_i0"></a>1.1.2.2.2.2.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetIndexes > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes_anyOf_i1"></a>1.1.2.2.2.2.2.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetIndexes > anyOf > item 1`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of number` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                  | Description |
| ---------------------------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetIndexes_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_3"></a>1.1.2.2.2.2.2.2.1. root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetIndexes > anyOf > item 1 > item 1 items

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetNames"></a>1.1.2.2.2.2.3. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** One or more named sheets in the Excel file that will be included in the dataset.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                           | Description |
| --------------------------------------------------------------------------------------------------------- | ----------- |
| [sheetNames items](#datasets_additionalProperties_formatOptions_anyOf_i1_excel_anyOf_i1_sheetNames_items) | -           |

###### <a name="autogenerated_heading_4"></a>1.1.2.2.2.2.3.1. root > datasets > additionalProperties > formatOptions > anyOf > item 1 > excel > anyOf > item 1 > sheetNames > sheetNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json"></a>1.1.2.2.3. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Options that define how JSON input is to be interpreted by DataBrew.

| Any of(Option)                                                                                        |
| ----------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i0)                    |
| [CfnDataset.JsonOptionsProperty](#datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1) |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i0"></a>1.1.2.2.3.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1"></a>1.1.2.2.3.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json > anyOf > CfnDataset.JsonOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.JsonOptionsProperty            |

**Description:** Represents the JSON-specific options that define how input is to be interpreted by AWS Glue DataBrew .

| Property                                                                                      | Pattern | Type        | Deprecated | Definition | Title/Description                                                                |
| --------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------- |
| - [multiLine](#datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine ) | No      | Combination | No         | -          | A value that specifies whether JSON input contains embedded new line characters. |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine"></a>1.1.2.2.3.2.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json > anyOf > item 1 > multiLine`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A value that specifies whether JSON input contains embedded new line characters.

| Any of(Option)                                                                                        |
| ----------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine_anyOf_i0) |
| [item 1](#datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine_anyOf_i1)      |

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine_anyOf_i0"></a>1.1.2.2.3.2.1.1. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json > anyOf > item 1 > multiLine > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_formatOptions_anyOf_i1_json_anyOf_i1_multiLine_anyOf_i1"></a>1.1.2.2.3.2.1.2. Property `root > datasets > additionalProperties > formatOptions > anyOf > item 1 > json > anyOf > item 1 > multiLine > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

#### <a name="datasets_additionalProperties_input"></a>1.1.3. Property `root > datasets > additionalProperties > input`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                            |
| ------------------------------------------------------------------------- |
| [CfnDataset.InputProperty](#datasets_additionalProperties_input_anyOf_i0) |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i1)              |

##### <a name="datasets_additionalProperties_input_anyOf_i0"></a>1.1.3.1. Property `root > datasets > additionalProperties > input > anyOf > CfnDataset.InputProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.InputProperty                  |

**Description:** Represents information on how DataBrew can find data, in either the AWS Glue Data Catalog or Amazon S3.

| Property                                                                                                  | Pattern | Type        | Deprecated | Definition | Title/Description                                                      |
| --------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ---------------------------------------------------------------------- |
| - [dataCatalogInputDefinition](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition ) | No      | Combination | No         | -          | The AWS Glue Data Catalog parameters for the data.                     |
| - [databaseInputDefinition](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition )       | No      | Combination | No         | -          | Connection information for dataset input files stored in a database.   |
| - [metadata](#datasets_additionalProperties_input_anyOf_i0_metadata )                                     | No      | Combination | No         | -          | Contains additional resource information needed for specific datasets. |
| - [s3InputDefinition](#datasets_additionalProperties_input_anyOf_i0_s3InputDefinition )                   | No      | Combination | No         | -          | The Amazon S3 location where the data is stored.                       |

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition"></a>1.1.3.1.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The AWS Glue Data Catalog parameters for the data.

| Any of(Option)                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i0)                                   |
| [CfnDataset.DataCatalogInputDefinitionProperty](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i0"></a>1.1.3.1.1.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1"></a>1.1.3.1.1.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > CfnDataset.DataCatalogInputDefinitionProperty`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | No                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Defined in**            | #/definitions/CfnDataset.DataCatalogInputDefinitionProperty |

**Description:** Represents how metadata stored in the AWS Glue Data Catalog is defined in a DataBrew dataset.

| Property                                                                                                            | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| - [catalogId](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_catalogId )         | No      | string      | No         | -          | The unique identifier of the AWS account that holds the Data Catalog that stores the data.                 |
| - [databaseName](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_databaseName )   | No      | string      | No         | -          | The name of a database in the Data Catalog.                                                                |
| - [tableName](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tableName )         | No      | string      | No         | -          | The name of a database table in the Data Catalog.<br /><br />This table corresponds to a DataBrew dataset. |
| - [tempDirectory](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory ) | No      | Combination | No         | -          | An Amazon location that AWS Glue Data Catalog can use as a temporary directory.                            |

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_catalogId"></a>1.1.3.1.1.2.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > catalogId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The unique identifier of the AWS account that holds the Data Catalog that stores the data.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_databaseName"></a>1.1.3.1.1.2.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of a database in the Data Catalog.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tableName"></a>1.1.3.1.1.2.3. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tableName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of a database table in the Data Catalog.

This table corresponds to a DataBrew dataset.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory"></a>1.1.3.1.1.2.4. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tempDirectory`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** An Amazon location that AWS Glue Data Catalog can use as a temporary directory.

| Any of(Option)                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i0)                   |
| [CfnDataset.S3LocationProperty](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i0"></a>1.1.3.1.1.2.4.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tempDirectory > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1"></a>1.1.3.1.1.2.4.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tempDirectory > anyOf > CfnDataset.S3LocationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.S3LocationProperty             |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

| Property                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------- |
| + [bucket](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1_bucket ) | No      | string | No         | -          | The Amazon S3 bucket name.                   |
| - [key](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1_key )       | No      | string | No         | -          | The unique name of the object in the bucket. |

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1_bucket"></a>1.1.3.1.1.2.4.2.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tempDirectory > anyOf > item 1 > bucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon S3 bucket name.

###### <a name="datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1_key"></a>1.1.3.1.1.2.4.2.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > dataCatalogInputDefinition > anyOf > item 1 > tempDirectory > anyOf > item 1 > key`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The unique name of the object in the bucket.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition"></a>1.1.3.1.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Connection information for dataset input files stored in a database.

| Any of(Option)                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i0)                                |
| [CfnDataset.DatabaseInputDefinitionProperty](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i0"></a>1.1.3.1.2.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1"></a>1.1.3.1.2.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > CfnDataset.DatabaseInputDefinitionProperty`

|                           |                                                          |
| ------------------------- | -------------------------------------------------------- |
| **Type**                  | `object`                                                 |
| **Required**              | No                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")  |
| **Defined in**            | #/definitions/CfnDataset.DatabaseInputDefinitionProperty |

**Description:** Connection information for dataset input files stored in a database.

| Property                                                                                                                   | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| - [databaseTableName](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_databaseTableName )   | No      | string      | No         | -          | The table within the target database.                                                                                                     |
| + [glueConnectionName](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_glueConnectionName ) | No      | string      | No         | -          | The AWS Glue Connection that stores the connection information for the target database.                                                   |
| - [queryString](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_queryString )               | No      | string      | No         | -          | Custom SQL to run against the provided AWS Glue connection.<br /><br />This SQL will be used as the input for DataBrew projects and jobs. |
| - [tempDirectory](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory )           | No      | Combination | No         | -          | An Amazon location that AWS Glue Data Catalog can use as a temporary directory.                                                           |

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_databaseTableName"></a>1.1.3.1.2.2.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > databaseTableName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The table within the target database.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_glueConnectionName"></a>1.1.3.1.2.2.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > glueConnectionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS Glue Connection that stores the connection information for the target database.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_queryString"></a>1.1.3.1.2.2.3. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > queryString`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Custom SQL to run against the provided AWS Glue connection.

This SQL will be used as the input for DataBrew projects and jobs.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory"></a>1.1.3.1.2.2.4. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > tempDirectory`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** An Amazon location that AWS Glue Data Catalog can use as a temporary directory.

| Any of(Option)                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory_anyOf_i0)                   |
| [CfnDataset.S3LocationProperty](#datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory_anyOf_i0"></a>1.1.3.1.2.2.4.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > tempDirectory > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_databaseInputDefinition_anyOf_i1_tempDirectory_anyOf_i1"></a>1.1.3.1.2.2.4.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > databaseInputDefinition > anyOf > item 1 > tempDirectory > anyOf > CfnDataset.S3LocationProperty`

|                           |                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                            |
| **Required**              | No                                                                                                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                             |
| **Same definition as**    | [datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1) |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

###### <a name="datasets_additionalProperties_input_anyOf_i0_metadata"></a>1.1.3.1.3. Property `root > datasets > additionalProperties > input > anyOf > item 0 > metadata`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Contains additional resource information needed for specific datasets.

| Any of(Option)                                                                                 |
| ---------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i0)                 |
| [CfnDataset.MetadataProperty](#datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i0"></a>1.1.3.1.3.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > metadata > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i1"></a>1.1.3.1.3.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > metadata > anyOf > CfnDataset.MetadataProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.MetadataProperty               |

**Description:** Contains additional resource information needed for specific datasets.

| Property                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| - [sourceArn](#datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i1_sourceArn ) | No      | string | No         | -          | The Amazon Resource Name (ARN) associated with the dataset.<br /><br />Currently, DataBrew only supports ARNs from Amazon AppFlow. |

###### <a name="datasets_additionalProperties_input_anyOf_i0_metadata_anyOf_i1_sourceArn"></a>1.1.3.1.3.2.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > metadata > anyOf > item 1 > sourceArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) associated with the dataset.

Currently, DataBrew only supports ARNs from Amazon AppFlow.

###### <a name="datasets_additionalProperties_input_anyOf_i0_s3InputDefinition"></a>1.1.3.1.4. Property `root > datasets > additionalProperties > input > anyOf > item 0 > s3InputDefinition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The Amazon S3 location where the data is stored.

| Any of(Option)                                                                                            |
| --------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_input_anyOf_i0_s3InputDefinition_anyOf_i0)                   |
| [CfnDataset.S3LocationProperty](#datasets_additionalProperties_input_anyOf_i0_s3InputDefinition_anyOf_i1) |

###### <a name="datasets_additionalProperties_input_anyOf_i0_s3InputDefinition_anyOf_i0"></a>1.1.3.1.4.1. Property `root > datasets > additionalProperties > input > anyOf > item 0 > s3InputDefinition > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_input_anyOf_i0_s3InputDefinition_anyOf_i1"></a>1.1.3.1.4.2. Property `root > datasets > additionalProperties > input > anyOf > item 0 > s3InputDefinition > anyOf > CfnDataset.S3LocationProperty`

|                           |                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                            |
| **Required**              | No                                                                                                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                             |
| **Same definition as**    | [datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1](#datasets_additionalProperties_input_anyOf_i0_dataCatalogInputDefinition_anyOf_i1_tempDirectory_anyOf_i1) |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

##### <a name="datasets_additionalProperties_input_anyOf_i1"></a>1.1.3.2. Property `root > datasets > additionalProperties > input > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

#### <a name="datasets_additionalProperties_pathOptions"></a>1.1.4. Property `root > datasets > additionalProperties > pathOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                        |
| ------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i0)                    |
| [CfnDataset.PathOptionsProperty](#datasets_additionalProperties_pathOptions_anyOf_i1) |

##### <a name="datasets_additionalProperties_pathOptions_anyOf_i0"></a>1.1.4.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="datasets_additionalProperties_pathOptions_anyOf_i1"></a>1.1.4.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > CfnDataset.PathOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.PathOptionsProperty            |

**Description:** Represents a set of options that define how DataBrew selects files for a given Amazon S3 path in a dataset.

| Property                                                                                                      | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| - [filesLimit](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit )                               | No      | Combination | No         | -          | If provided, this structure imposes a limit on a number of files that should be selected.                                                |
| - [lastModifiedDateCondition](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition ) | No      | Combination | No         | -          | If provided, this structure defines a date range for matching Amazon S3 objects based on their LastModifiedDate attribute in Amazon S3 . |
| - [parameters](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters )                               | No      | Combination | No         | -          | A structure that maps names of parameters used in the Amazon S3 path of a dataset to their definitions.                                  |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit"></a>1.1.4.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** If provided, this structure imposes a limit on a number of files that should be selected.

| Any of(Option)                                                                                           |
| -------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i0)                   |
| [CfnDataset.FilesLimitProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i0"></a>1.1.4.2.1.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1"></a>1.1.4.2.1.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit > anyOf > CfnDataset.FilesLimitProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.FilesLimitProperty             |

**Description:** Represents a limit imposed on number of Amazon S3 files that should be selected for a dataset from a connected Amazon S3 path.

| Property                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [maxFiles](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_maxFiles )   | No      | number | No         | -          | The number of Amazon S3 files to select.                                                                                                                                                          |
| - [order](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_order )         | No      | string | No         | -          | A criteria to use for Amazon S3 files sorting before their selection.<br /><br />By default uses DESCENDING order, i.e. most recent files are selected first. Anotherpossible value is ASCENDING. |
| - [orderedBy](#datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_orderedBy ) | No      | string | No         | -          | A criteria to use for Amazon S3 files sorting before their selection.<br /><br />By default uses LAST_MODIFIED_DATE as a sorting criteria. Currently it's the only allowed value.                 |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_maxFiles"></a>1.1.4.2.1.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit > anyOf > item 1 > maxFiles`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** The number of Amazon S3 files to select.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_order"></a>1.1.4.2.1.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit > anyOf > item 1 > order`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A criteria to use for Amazon S3 files sorting before their selection.

By default uses DESCENDING order, i.e. most recent files are selected first. Anotherpossible value is ASCENDING.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_filesLimit_anyOf_i1_orderedBy"></a>1.1.4.2.1.2.3. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > filesLimit > anyOf > item 1 > orderedBy`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A criteria to use for Amazon S3 files sorting before their selection.

By default uses LAST_MODIFIED_DATE as a sorting criteria. Currently it's the only allowed value.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition"></a>1.1.4.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** If provided, this structure defines a date range for matching Amazon S3 objects based on their LastModifiedDate attribute in Amazon S3 .

| Any of(Option)                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i0)                         |
| [CfnDataset.FilterExpressionProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i0"></a>1.1.4.2.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1"></a>1.1.4.2.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > CfnDataset.FilterExpressionProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.FilterExpressionProperty       |

**Description:** Represents a structure for defining parameter conditions.

| Property                                                                                                           | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [expression](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_expression ) | No      | string      | No         | -          | The expression which includes condition names followed by substitution variables, possibly grouped and combined with other conditions.<br /><br />For example, "(starts_with :prefix1 or starts_with :prefix2) and (ends_with :suffix1 or ends_with :suffix2)". Substitution variables should start with ':' symbol. |
| + [valuesMap](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap )   | No      | Combination | No         | -          | The map of substitution variable names to their values used in this filter expression.                                                                                                                                                                                                                               |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_expression"></a>1.1.4.2.2.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > expression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The expression which includes condition names followed by substitution variables, possibly grouped and combined with other conditions.

For example, "(starts_with :prefix1 or starts_with :prefix2) and (ends_with :suffix1 or ends_with :suffix2)". Substitution variables should start with ':' symbol.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap"></a>1.1.4.2.2.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The map of substitution variable names to their values used in this filter expression.

| Any of(Option)                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i0) |
| [item 1](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1)      |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i0"></a>1.1.4.2.2.2.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1"></a>1.1.4.2.2.2.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1`

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

| Each item of this array must be                                                                                                 | Description |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_5"></a>1.1.4.2.2.2.2.2.1. root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i0)                    |
| [CfnDataset.FilterValueProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i0"></a>1.1.4.2.2.2.2.2.1.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1"></a>1.1.4.2.2.2.2.2.1.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1 > item 1 items > anyOf > CfnDataset.FilterValueProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.FilterValueProperty            |

**Description:** Represents a single entry in the `ValuesMap` of a `FilterExpression` .

A `FilterValue` associates the name of a substitution variable in an expression to its value.

| Property                                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------- |
| + [value](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1_value )                   | No      | string | No         | -          | The value to be associated with the substitution variable. |
| + [valueReference](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1_valueReference ) | No      | string | No         | -          | The substitution variable reference.                       |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1_value"></a>1.1.4.2.2.2.2.2.1.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1 > item 1 items > anyOf > item 1 > value`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The value to be associated with the substitution variable.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1_valuesMap_anyOf_i1_items_anyOf_i1_valueReference"></a>1.1.4.2.2.2.2.2.1.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > lastModifiedDateCondition > anyOf > item 1 > valuesMap > anyOf > item 1 > item 1 items > anyOf > item 1 > valueReference`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The substitution variable reference.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters"></a>1.1.4.2.3. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A structure that maps names of parameters used in the Amazon S3 path of a dataset to their definitions.

| Any of(Option)                                                                         |
| -------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i0) |
| [item 1](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1)      |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i0"></a>1.1.4.2.3.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1"></a>1.1.4.2.3.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1`

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

| Each item of this array must be                                                               | Description |
| --------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_6"></a>1.1.4.2.3.2.1. root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i0)                      |
| [CfnDataset.PathParameterProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i0"></a>1.1.4.2.3.2.1.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1"></a>1.1.4.2.3.2.1.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > CfnDataset.PathParameterProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.PathParameterProperty          |

**Description:** Represents a single entry in the path parameters of a dataset.

Each `PathParameter` consists of a name and a parameter definition.

| Property                                                                                                                         | Pattern | Type        | Deprecated | Definition | Title/Description               |
| -------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------- |
| + [datasetParameter](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter )   | No      | Combination | No         | -          | The path parameter definition.  |
| + [pathParameterName](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_pathParameterName ) | No      | string      | No         | -          | The name of the path parameter. |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter"></a>1.1.4.2.3.2.1.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The path parameter definition.

| Any of(Option)                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i0)                         |
| [CfnDataset.DatasetParameterProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i0"></a>1.1.4.2.3.2.1.2.1.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1"></a>1.1.4.2.3.2.1.2.1.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > CfnDataset.DatasetParameterProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.DatasetParameterProperty       |

**Description:** Represents a dataset paramater that defines type and conditions for a parameter in the Amazon S3 path of the dataset.

| Property                                                                                                                                               | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ----------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| - [createColumn](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn )       | No      | Combination | No         | -          | Optional boolean value that defines whether the captured value of this parameter should be loaded as an additional column in the dataset. |
| - [datetimeOptions](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions ) | No      | Combination | No         | -          | Additional parameter options such as a format and a timezone.<br /><br />Required for datetime parameters.                                |
| - [filter](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter )                   | No      | Combination | No         | -          | The optional filter expression structure to apply additional matching criteria to the parameter.                                          |
| + [name](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_name )                       | No      | string      | No         | -          | The name of the parameter that is used in the dataset's Amazon S3 path.                                                                   |
| + [type](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_type )                       | No      | string      | No         | -          | The type of the dataset parameter, can be one of a 'String', 'Number' or 'Datetime'.                                                      |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn"></a>1.1.4.2.3.2.1.2.1.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > createColumn`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Optional boolean value that defines whether the captured value of this parameter should be loaded as an additional column in the dataset.

| Any of(Option)                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn_anyOf_i0) |
| [item 1](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn_anyOf_i1)      |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn_anyOf_i0"></a>1.1.4.2.3.2.1.2.1.2.1.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > createColumn > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_createColumn_anyOf_i1"></a>1.1.4.2.3.2.1.2.1.2.1.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > createColumn > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions"></a>1.1.4.2.3.2.1.2.1.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Additional parameter options such as a format and a timezone.

Required for datetime parameters.

| Any of(Option)                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i0)                        |
| [CfnDataset.DatetimeOptionsProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i0"></a>1.1.4.2.3.2.1.2.1.2.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1"></a>1.1.4.2.3.2.1.2.1.2.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions > anyOf > CfnDataset.DatetimeOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDataset.DatetimeOptionsProperty        |

**Description:** Represents additional options for correct interpretation of datetime parameters used in the Amazon S3 path of a dataset.

| Property                                                                                                                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [format](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_format )                 | No      | string | No         | -          | Required option, that defines the datetime format used for a date parameter in the Amazon S3 path.<br /><br />Should use only supported datetime specifiers and separation characters, all litera a-z or A-Z character should be escaped with single quotes. E.g. "MM.dd.yyyy-'at'-HH:mm". |
| - [localeCode](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_localeCode )         | No      | string | No         | -          | Optional value for a non-US locale code, needed for correct interpretation of some date formats.                                                                                                                                                                                           |
| - [timezoneOffset](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_timezoneOffset ) | No      | string | No         | -          | Optional value for a timezone offset of the datetime parameter value in the Amazon S3 path.<br /><br />Shouldn't be used if Format for this parameter includes timezone fields. If no offset specified, UTC is assumed.                                                                    |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_format"></a>1.1.4.2.3.2.1.2.1.2.2.2.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions > anyOf > item 1 > format`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Required option, that defines the datetime format used for a date parameter in the Amazon S3 path.

Should use only supported datetime specifiers and separation characters, all litera a-z or A-Z character should be escaped with single quotes. E.g. "MM.dd.yyyy-'at'-HH:mm".

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_localeCode"></a>1.1.4.2.3.2.1.2.1.2.2.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions > anyOf > item 1 > localeCode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optional value for a non-US locale code, needed for correct interpretation of some date formats.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_datetimeOptions_anyOf_i1_timezoneOffset"></a>1.1.4.2.3.2.1.2.1.2.2.2.3. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > datetimeOptions > anyOf > item 1 > timezoneOffset`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optional value for a timezone offset of the datetime parameter value in the Amazon S3 path.

Shouldn't be used if Format for this parameter includes timezone fields. If no offset specified, UTC is assumed.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter"></a>1.1.4.2.3.2.1.2.1.2.3. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > filter`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The optional filter expression structure to apply additional matching criteria to the parameter.

| Any of(Option)                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter_anyOf_i0)                         |
| [CfnDataset.FilterExpressionProperty](#datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter_anyOf_i1) |

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter_anyOf_i0"></a>1.1.4.2.3.2.1.2.1.2.3.1. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > filter > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_filter_anyOf_i1"></a>1.1.4.2.3.2.1.2.1.2.3.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > filter > anyOf > CfnDataset.FilterExpressionProperty`

|                           |                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                        |
| **Required**              | No                                                                                                                                                                              |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                         |
| **Same definition as**    | [datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1](#datasets_additionalProperties_pathOptions_anyOf_i1_lastModifiedDateCondition_anyOf_i1) |

**Description:** Represents a structure for defining parameter conditions.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_name"></a>1.1.4.2.3.2.1.2.1.2.4. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the parameter that is used in the dataset's Amazon S3 path.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_datasetParameter_anyOf_i1_type"></a>1.1.4.2.3.2.1.2.1.2.5. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > datasetParameter > anyOf > item 1 > type`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The type of the dataset parameter, can be one of a 'String', 'Number' or 'Datetime'.

###### <a name="datasets_additionalProperties_pathOptions_anyOf_i1_parameters_anyOf_i1_items_anyOf_i1_pathParameterName"></a>1.1.4.2.3.2.1.2.2. Property `root > datasets > additionalProperties > pathOptions > anyOf > item 1 > parameters > anyOf > item 1 > item 1 items > anyOf > item 1 > pathParameterName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the path parameter.

## <a name="deploymentRole"></a>2. Property `root > deploymentRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="jobs"></a>3. Property `root > jobs`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | No                                                                                                             |
| **Additional properties** | [[Should-conform]](#jobs_additionalProperties "Each additional property must conform to the following schema") |

| Property                          | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| --------------------------------- | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#jobs_additionalProperties ) | No      | object | No         | In #/definitions/DataBrewJobProps | -                 |

### <a name="jobs_additionalProperties"></a>3.1. Property `root > jobs > DataBrewJobProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataBrewJobProps                          |

| Property                                                                           | Pattern | Type        | Deprecated | Definition                                             | Title/Description                                                            |
| ---------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| - [dataCatalogOutputs](#jobs_additionalProperties_dataCatalogOutputs )             | No      | Combination | No         | -                                                      | -                                                                            |
| - [databaseOutputs](#jobs_additionalProperties_databaseOutputs )                   | No      | Combination | No         | -                                                      | -                                                                            |
| + [dataset](#jobs_additionalProperties_dataset )                                   | No      | object      | No         | In #/definitions/ConfigOptions                         | -                                                                            |
| + [executionRole](#jobs_additionalProperties_executionRole )                       | No      | object      | No         | In #/definitions/MdaaRoleRef                           | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |
| - [jobSample](#jobs_additionalProperties_jobSample )                               | No      | Combination | No         | -                                                      | -                                                                            |
| + [kmsKeyArn](#jobs_additionalProperties_kmsKeyArn )                               | No      | string      | No         | -                                                      | -                                                                            |
| - [logSubscription](#jobs_additionalProperties_logSubscription )                   | No      | string      | No         | -                                                      | -                                                                            |
| - [maxCapacity](#jobs_additionalProperties_maxCapacity )                           | No      | number      | No         | -                                                      | -                                                                            |
| - [maxRetries](#jobs_additionalProperties_maxRetries )                             | No      | number      | No         | -                                                      | -                                                                            |
| - [outputLocation](#jobs_additionalProperties_outputLocation )                     | No      | Combination | No         | -                                                      | -                                                                            |
| - [outputs](#jobs_additionalProperties_outputs )                                   | No      | Combination | No         | -                                                      | -                                                                            |
| - [profileConfiguration](#jobs_additionalProperties_profileConfiguration )         | No      | Combination | No         | -                                                      | -                                                                            |
| - [projectName](#jobs_additionalProperties_projectName )                           | No      | string      | No         | -                                                      | -                                                                            |
| - [recipe](#jobs_additionalProperties_recipe )                                     | No      | object      | No         | Same as [dataset](#jobs_additionalProperties_dataset ) | -                                                                            |
| - [schedule](#jobs_additionalProperties_schedule )                                 | No      | object      | No         | In #/definitions/ConfigSchedule                        | -                                                                            |
| - [timeout](#jobs_additionalProperties_timeout )                                   | No      | number      | No         | -                                                      | -                                                                            |
| + [type](#jobs_additionalProperties_type )                                         | No      | string      | No         | -                                                      | -                                                                            |
| - [validationConfigurations](#jobs_additionalProperties_validationConfigurations ) | No      | Combination | No         | -                                                      | -                                                                            |

#### <a name="jobs_additionalProperties_dataCatalogOutputs"></a>3.1.1. Property `root > jobs > additionalProperties > dataCatalogOutputs`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                        |
| --------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i0) |
| [item 1](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1)      |

##### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i0"></a>3.1.1.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1"></a>3.1.1.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1`

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

| Each item of this array must be                                              | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_7"></a>3.1.1.2.1. root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                            |
| --------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i0)                      |
| [CfnJob.DataCatalogOutputProperty](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i0"></a>3.1.1.2.1.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1"></a>3.1.1.2.1.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > CfnJob.DataCatalogOutputProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.DataCatalogOutputProperty          |

**Description:** Represents options that specify how and where in the AWS Glue Data Catalog DataBrew writes the output generated by recipe jobs.

| Property                                                                                                    | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [catalogId](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_catalogId )             | No      | string      | No         | -          | The unique identifier of the AWS account that holds the Data Catalog that stores the data.                                                                     |
| + [databaseName](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseName )       | No      | string      | No         | -          | The name of a database in the Data Catalog.                                                                                                                    |
| - [databaseOptions](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions ) | No      | Combination | No         | -          | Represents options that specify how and where DataBrew writes the database output generated by recipe jobs.                                                    |
| - [overwrite](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite )             | No      | Combination | No         | -          | A value that, if true, means that any data in the location specified for output is overwritten with new output.<br /><br />Not supported with DatabaseOptions. |
| - [s3Options](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options )             | No      | Combination | No         | -          | Represents options that specify how and where DataBrew writes the Amazon S3 output generated by recipe jobs.                                                   |
| + [tableName](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_tableName )             | No      | string      | No         | -          | The name of a table in the Data Catalog.                                                                                                                       |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_catalogId"></a>3.1.1.2.1.2.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > catalogId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The unique identifier of the AWS account that holds the Data Catalog that stores the data.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseName"></a>3.1.1.2.1.2.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of a database in the Data Catalog.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions"></a>3.1.1.2.1.2.3. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents options that specify how and where DataBrew writes the database output generated by recipe jobs.

| Any of(Option)                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i0)                               |
| [CfnJob.DatabaseTableOutputOptionsProperty](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1) |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i0"></a>3.1.1.2.1.2.3.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1"></a>3.1.1.2.1.2.3.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > CfnJob.DatabaseTableOutputOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.DatabaseTableOutputOptionsProperty |

**Description:** Represents options that specify how and where DataBrew writes the database output generated by recipe jobs.

| Property                                                                                                                         | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| + [tableName](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tableName )         | No      | string      | No         | -          | A prefix for the name of a table DataBrew will create in the database.                                       |
| - [tempDirectory](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory ) | No      | Combination | No         | -          | Represents an Amazon S3 location (bucket name and object key) where DataBrew can store intermediate results. |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tableName"></a>3.1.1.2.1.2.3.2.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tableName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A prefix for the name of a table DataBrew will create in the database.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory"></a>3.1.1.2.1.2.3.2.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents an Amazon S3 location (bucket name and object key) where DataBrew can store intermediate results.

| Any of(Option)                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i0)               |
| [CfnJob.S3LocationProperty](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1) |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i0"></a>3.1.1.2.1.2.3.2.2.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1"></a>3.1.1.2.1.2.3.2.2.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory > anyOf > CfnJob.S3LocationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.S3LocationProperty                 |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

| Property                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------- |
| + [bucket](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_bucket )           | No      | string | No         | -          | The Amazon S3 bucket name.                   |
| - [bucketOwner](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_bucketOwner ) | No      | string | No         | -          | The AWS account ID of the bucket owner.      |
| - [key](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_key )                 | No      | string | No         | -          | The unique name of the object in the bucket. |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_bucket"></a>3.1.1.2.1.2.3.2.2.2.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory > anyOf > item 1 > bucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon S3 bucket name.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_bucketOwner"></a>3.1.1.2.1.2.3.2.2.2.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory > anyOf > item 1 > bucketOwner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The AWS account ID of the bucket owner.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1_key"></a>3.1.1.2.1.2.3.2.2.2.3. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > item 1 > tempDirectory > anyOf > item 1 > key`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The unique name of the object in the bucket.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite"></a>3.1.1.2.1.2.4. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A value that, if true, means that any data in the location specified for output is overwritten with new output.

Not supported with DatabaseOptions.

| Any of(Option)                                                                                          |
| ------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i0) |
| [item 1](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i1)      |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i0"></a>3.1.1.2.1.2.4.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i1"></a>3.1.1.2.1.2.4.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options"></a>3.1.1.2.1.2.5. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents options that specify how and where DataBrew writes the Amazon S3 output generated by recipe jobs.

| Any of(Option)                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i0)                         |
| [CfnJob.S3TableOutputOptionsProperty](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1) |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i0"></a>3.1.1.2.1.2.5.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1"></a>3.1.1.2.1.2.5.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options > anyOf > CfnJob.S3TableOutputOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.S3TableOutputOptionsProperty       |

**Description:** Represents options that specify how and where DataBrew writes the Amazon S3 output generated by recipe jobs.

| Property                                                                                                         | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| + [location](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location ) | No      | Combination | No         | -          | Represents an Amazon S3 location (bucket name and object key) where DataBrew can write output from a job. |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location"></a>3.1.1.2.1.2.5.2.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options > anyOf > item 1 > location`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents an Amazon S3 location (bucket name and object key) where DataBrew can write output from a job.

| Any of(Option)                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location_anyOf_i0)               |
| [CfnJob.S3LocationProperty](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location_anyOf_i1) |

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location_anyOf_i0"></a>3.1.1.2.1.2.5.2.1.1. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options > anyOf > item 1 > location > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_s3Options_anyOf_i1_location_anyOf_i1"></a>3.1.1.2.1.2.5.2.1.2. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > s3Options > anyOf > item 1 > location > anyOf > CfnJob.S3LocationProperty`

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                                                       |
| **Same definition as**    | [jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1) |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

###### <a name="jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_tableName"></a>3.1.1.2.1.2.6. Property `root > jobs > additionalProperties > dataCatalogOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > tableName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of a table in the Data Catalog.

#### <a name="jobs_additionalProperties_databaseOutputs"></a>3.1.2. Property `root > jobs > additionalProperties > databaseOutputs`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                     |
| ------------------------------------------------------------------ |
| [IResolvable](#jobs_additionalProperties_databaseOutputs_anyOf_i0) |
| [item 1](#jobs_additionalProperties_databaseOutputs_anyOf_i1)      |

##### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i0"></a>3.1.2.1. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1"></a>3.1.2.2. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1`

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

| Each item of this array must be                                           | Description |
| ------------------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_8"></a>3.1.2.2.1. root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                      |
| --------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i0)                   |
| [CfnJob.DatabaseOutputProperty](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i0"></a>3.1.2.2.1.1. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1"></a>3.1.2.2.1.2. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > CfnJob.DatabaseOutputProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.DatabaseOutputProperty             |

**Description:** Represents a JDBC database output object which defines the output destination for a DataBrew recipe job to write into.

| Property                                                                                                       | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| + [databaseOptions](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions )       | No      | Combination | No         | -          | Represents options that specify how and where DataBrew writes the database output generated by recipe jobs. |
| - [databaseOutputMode](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOutputMode ) | No      | string      | No         | -          | The output mode to write into the database.<br /><br />Currently supported option: NEW_TABLE.               |
| + [glueConnectionName](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_glueConnectionName ) | No      | string      | No         | -          | The AWS Glue connection that stores the connection information for the target database.                     |

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions"></a>3.1.2.2.1.2.1. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents options that specify how and where DataBrew writes the database output generated by recipe jobs.

| Any of(Option)                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i0)                               |
| [CfnJob.DatabaseTableOutputOptionsProperty](#jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1) |

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i0"></a>3.1.2.2.1.2.1.1. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1"></a>3.1.2.2.1.2.1.2. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOptions > anyOf > CfnJob.DatabaseTableOutputOptionsProperty`

|                           |                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                        |
| **Required**              | No                                                                                                                                                                                              |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                         |
| **Same definition as**    | [jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1) |

**Description:** Represents options that specify how and where DataBrew writes the database output generated by recipe jobs.

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_databaseOutputMode"></a>3.1.2.2.1.2.2. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > databaseOutputMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The output mode to write into the database.

Currently supported option: NEW_TABLE.

###### <a name="jobs_additionalProperties_databaseOutputs_anyOf_i1_items_anyOf_i1_glueConnectionName"></a>3.1.2.2.1.2.3. Property `root > jobs > additionalProperties > databaseOutputs > anyOf > item 1 > item 1 items > anyOf > item 1 > glueConnectionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS Glue connection that stores the connection information for the target database.

#### <a name="jobs_additionalProperties_dataset"></a>3.1.3. Property `root > jobs > additionalProperties > dataset`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ConfigOptions                             |

| Property                                                     | Pattern | Type   | Deprecated | Definition                             | Title/Description                                                     |
| ------------------------------------------------------------ | ------- | ------ | ---------- | -------------------------------------- | --------------------------------------------------------------------- |
| - [existing](#jobs_additionalProperties_dataset_existing )   | No      | object | No         | In #/definitions/CfnJob.RecipeProperty | Represents one or more actions to be performed on a DataBrew dataset. |
| - [generated](#jobs_additionalProperties_dataset_generated ) | No      | string | No         | -                                      | -                                                                     |

##### <a name="jobs_additionalProperties_dataset_existing"></a>3.1.3.1. Property `root > jobs > additionalProperties > dataset > existing`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.RecipeProperty                     |

**Description:** Represents one or more actions to be performed on a DataBrew dataset.

| Property                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                              |
| ----------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------- |
| + [name](#jobs_additionalProperties_dataset_existing_name )       | No      | string | No         | -          | The unique name for the recipe.                |
| - [version](#jobs_additionalProperties_dataset_existing_version ) | No      | string | No         | -          | The identifier for the version for the recipe. |

###### <a name="jobs_additionalProperties_dataset_existing_name"></a>3.1.3.1.1. Property `root > jobs > additionalProperties > dataset > existing > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The unique name for the recipe.

###### <a name="jobs_additionalProperties_dataset_existing_version"></a>3.1.3.1.2. Property `root > jobs > additionalProperties > dataset > existing > version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The identifier for the version for the recipe.

##### <a name="jobs_additionalProperties_dataset_generated"></a>3.1.3.2. Property `root > jobs > additionalProperties > dataset > generated`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_executionRole"></a>3.1.4. Property `root > jobs > additionalProperties > executionRole`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                                           | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#jobs_additionalProperties_executionRole_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#jobs_additionalProperties_executionRole_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#jobs_additionalProperties_executionRole_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#jobs_additionalProperties_executionRole_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#jobs_additionalProperties_executionRole_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#jobs_additionalProperties_executionRole_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="jobs_additionalProperties_executionRole_arn"></a>3.1.4.1. Property `root > jobs > additionalProperties > executionRole > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="jobs_additionalProperties_executionRole_id"></a>3.1.4.2. Property `root > jobs > additionalProperties > executionRole > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="jobs_additionalProperties_executionRole_immutable"></a>3.1.4.3. Property `root > jobs > additionalProperties > executionRole > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="jobs_additionalProperties_executionRole_name"></a>3.1.4.4. Property `root > jobs > additionalProperties > executionRole > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="jobs_additionalProperties_executionRole_refId"></a>3.1.4.5. Property `root > jobs > additionalProperties > executionRole > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="jobs_additionalProperties_executionRole_sso"></a>3.1.4.6. Property `root > jobs > additionalProperties > executionRole > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

#### <a name="jobs_additionalProperties_jobSample"></a>3.1.5. Property `root > jobs > additionalProperties > jobSample`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                            |
| ------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_jobSample_anyOf_i0)              |
| [CfnJob.JobSampleProperty](#jobs_additionalProperties_jobSample_anyOf_i1) |

##### <a name="jobs_additionalProperties_jobSample_anyOf_i0"></a>3.1.5.1. Property `root > jobs > additionalProperties > jobSample > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_jobSample_anyOf_i1"></a>3.1.5.2. Property `root > jobs > additionalProperties > jobSample > anyOf > CfnJob.JobSampleProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.JobSampleProperty                  |

**Description:** A sample configuration for profile jobs only, which determines the number of rows on which the profile job is run.

If a `JobSample` value isn't provided, the default is used. The default value is CUSTOM_ROWS for the mode parameter and 20,000 for the size parameter.

| Property                                                      | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [mode](#jobs_additionalProperties_jobSample_anyOf_i1_mode ) | No      | string | No         | -          | A value that determines whether the profile job is run on the entire dataset or a specified number of rows.<br /><br />This value must be one of the following:<br /><br />- FULL_DATASET - The profile job is run on the entire dataset.<br />- CUSTOM_ROWS - The profile job is run on the number of rows specified in the \`Size\` parameter. |
| - [size](#jobs_additionalProperties_jobSample_anyOf_i1_size ) | No      | number | No         | -          | The \`Size\` parameter is only required when the mode is CUSTOM_ROWS.<br /><br />The profile job is run on the specified number of rows. The maximum value for size is Long.MAX_VALUE.<br /><br />Long.MAX_VALUE = 9223372036854775807                                                                                                           |

###### <a name="jobs_additionalProperties_jobSample_anyOf_i1_mode"></a>3.1.5.2.1. Property `root > jobs > additionalProperties > jobSample > anyOf > item 1 > mode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines whether the profile job is run on the entire dataset or a specified number of rows.

This value must be one of the following:

- FULL_DATASET - The profile job is run on the entire dataset.
- CUSTOM_ROWS - The profile job is run on the number of rows specified in the `Size` parameter.

###### <a name="jobs_additionalProperties_jobSample_anyOf_i1_size"></a>3.1.5.2.2. Property `root > jobs > additionalProperties > jobSample > anyOf > item 1 > size`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The `Size` parameter is only required when the mode is CUSTOM_ROWS.

The profile job is run on the specified number of rows. The maximum value for size is Long.MAX_VALUE.

Long.MAX_VALUE = 9223372036854775807

#### <a name="jobs_additionalProperties_kmsKeyArn"></a>3.1.6. Property `root > jobs > additionalProperties > kmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="jobs_additionalProperties_logSubscription"></a>3.1.7. Property `root > jobs > additionalProperties > logSubscription`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_maxCapacity"></a>3.1.8. Property `root > jobs > additionalProperties > maxCapacity`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_maxRetries"></a>3.1.9. Property `root > jobs > additionalProperties > maxRetries`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_outputLocation"></a>3.1.10. Property `root > jobs > additionalProperties > outputLocation`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                      |
| ----------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputLocation_anyOf_i0)                   |
| [CfnJob.OutputLocationProperty](#jobs_additionalProperties_outputLocation_anyOf_i1) |

##### <a name="jobs_additionalProperties_outputLocation_anyOf_i0"></a>3.1.10.1. Property `root > jobs > additionalProperties > outputLocation > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_outputLocation_anyOf_i1"></a>3.1.10.2. Property `root > jobs > additionalProperties > outputLocation > anyOf > CfnJob.OutputLocationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.OutputLocationProperty             |

**Description:** The location in Amazon S3 or AWS Glue Data Catalog where the job writes its output.

| Property                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description                            |
| -------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------- |
| + [bucket](#jobs_additionalProperties_outputLocation_anyOf_i1_bucket )           | No      | string | No         | -          | The Amazon S3 bucket name.                   |
| - [bucketOwner](#jobs_additionalProperties_outputLocation_anyOf_i1_bucketOwner ) | No      | string | No         | -          | -                                            |
| - [key](#jobs_additionalProperties_outputLocation_anyOf_i1_key )                 | No      | string | No         | -          | The unique name of the object in the bucket. |

###### <a name="jobs_additionalProperties_outputLocation_anyOf_i1_bucket"></a>3.1.10.2.1. Property `root > jobs > additionalProperties > outputLocation > anyOf > item 1 > bucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon S3 bucket name.

###### <a name="jobs_additionalProperties_outputLocation_anyOf_i1_bucketOwner"></a>3.1.10.2.2. Property `root > jobs > additionalProperties > outputLocation > anyOf > item 1 > bucketOwner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="jobs_additionalProperties_outputLocation_anyOf_i1_key"></a>3.1.10.2.3. Property `root > jobs > additionalProperties > outputLocation > anyOf > item 1 > key`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The unique name of the object in the bucket.

#### <a name="jobs_additionalProperties_outputs"></a>3.1.11. Property `root > jobs > additionalProperties > outputs`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                             |
| ---------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i0) |
| [item 1](#jobs_additionalProperties_outputs_anyOf_i1)      |

##### <a name="jobs_additionalProperties_outputs_anyOf_i0"></a>3.1.11.1. Property `root > jobs > additionalProperties > outputs > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_outputs_anyOf_i1"></a>3.1.11.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1`

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

| Each item of this array must be                                   | Description |
| ----------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_outputs_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_9"></a>3.1.11.2.1. root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                      |
| ----------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i0)           |
| [CfnJob.OutputProperty](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i0"></a>3.1.11.2.1.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1"></a>3.1.11.2.1.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > CfnJob.OutputProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.OutputProperty                     |

**Description:** Represents options that specify how and where in Amazon S3 DataBrew writes the output generated by recipe jobs or profile jobs.

| Property                                                                                             | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| - [compressionFormat](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_compressionFormat ) | No      | string          | No         | -          | The compression algorithm used to compress the output text of the job.                                          |
| - [format](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_format )                       | No      | string          | No         | -          | The data format of the output of the job.                                                                       |
| - [formatOptions](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions )         | No      | Combination     | No         | -          | Represents options that define how DataBrew formats job output files.                                           |
| + [location](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location )                   | No      | Combination     | No         | -          | The location in Amazon S3 where the job writes its output.                                                      |
| - [maxOutputFiles](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_maxOutputFiles )       | No      | number          | No         | -          | The maximum number of files to be generated by the job and written to the output folder.                        |
| - [overwrite](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite )                 | No      | Combination     | No         | -          | A value that, if true, means that any data in the location specified for output is overwritten with new output. |
| - [partitionColumns](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_partitionColumns )   | No      | array of string | No         | -          | The names of one or more partition columns for the output of the job.                                           |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_compressionFormat"></a>3.1.11.2.1.2.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > compressionFormat`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The compression algorithm used to compress the output text of the job.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_format"></a>3.1.11.2.1.2.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > format`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The data format of the output of the job.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions"></a>3.1.11.2.1.2.3. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents options that define how DataBrew formats job output files.

| Any of(Option)                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i0)                        |
| [CfnJob.OutputFormatOptionsProperty](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1) |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i0"></a>3.1.11.2.1.2.3.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1"></a>3.1.11.2.1.2.3.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > CfnJob.OutputFormatOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.OutputFormatOptionsProperty        |

**Description:** Represents a set of options that define the structure of comma-separated (CSV) job output.

| Property                                                                                        | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                |
| ----------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------ |
| - [csv](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv ) | No      | Combination | No         | -          | Represents a set of options that define the structure of comma-separated value (CSV) job output. |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv"></a>3.1.11.2.1.2.3.2.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > item 1 > csv`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Represents a set of options that define the structure of comma-separated value (CSV) job output.

| Any of(Option)                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i0)                     |
| [CfnJob.CsvOutputOptionsProperty](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i1) |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i0"></a>3.1.11.2.1.2.3.2.1.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > item 1 > csv > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i1"></a>3.1.11.2.1.2.3.2.1.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > item 1 > csv > anyOf > CfnJob.CsvOutputOptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.CsvOutputOptionsProperty           |

**Description:** Represents a set of options that define how DataBrew will write a comma-separated value (CSV) file.

| Property                                                                                                                 | Pattern | Type   | Deprecated | Definition | Title/Description                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------ |
| - [delimiter](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i1_delimiter ) | No      | string | No         | -          | A single character that specifies the delimiter used to create CSV job output. |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_formatOptions_anyOf_i1_csv_anyOf_i1_delimiter"></a>3.1.11.2.1.2.3.2.1.2.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > formatOptions > anyOf > item 1 > csv > anyOf > item 1 > delimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A single character that specifies the delimiter used to create CSV job output.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location"></a>3.1.11.2.1.2.4. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > location`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The location in Amazon S3 where the job writes its output.

| Any of(Option)                                                                                            |
| --------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location_anyOf_i0)               |
| [CfnJob.S3LocationProperty](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location_anyOf_i1) |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location_anyOf_i0"></a>3.1.11.2.1.2.4.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > location > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_location_anyOf_i1"></a>3.1.11.2.1.2.4.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > location > anyOf > CfnJob.S3LocationProperty`

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                                                       |
| **Same definition as**    | [jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1](#jobs_additionalProperties_dataCatalogOutputs_anyOf_i1_items_anyOf_i1_databaseOptions_anyOf_i1_tempDirectory_anyOf_i1) |

**Description:** Represents an Amazon S3 location (bucket name, bucket owner, and object key) where DataBrew can read input data, or write output from a job.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_maxOutputFiles"></a>3.1.11.2.1.2.5. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > maxOutputFiles`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum number of files to be generated by the job and written to the output folder.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite"></a>3.1.11.2.1.2.6. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A value that, if true, means that any data in the location specified for output is overwritten with new output.

| Any of(Option)                                                                               |
| -------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i0) |
| [item 1](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i1)      |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i0"></a>3.1.11.2.1.2.6.1. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_overwrite_anyOf_i1"></a>3.1.11.2.1.2.6.2. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > overwrite > anyOf > item 1`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_partitionColumns"></a>3.1.11.2.1.2.7. Property `root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > partitionColumns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** The names of one or more partition columns for the output of the job.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                             | Description |
| ----------------------------------------------------------------------------------------------------------- | ----------- |
| [partitionColumns items](#jobs_additionalProperties_outputs_anyOf_i1_items_anyOf_i1_partitionColumns_items) | -           |

###### <a name="autogenerated_heading_10"></a>3.1.11.2.1.2.7.1. root > jobs > additionalProperties > outputs > anyOf > item 1 > item 1 items > anyOf > item 1 > partitionColumns > partitionColumns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_profileConfiguration"></a>3.1.12. Property `root > jobs > additionalProperties > profileConfiguration`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                  |
| ----------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i0)                         |
| [CfnJob.ProfileConfigurationProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1) |

##### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i0"></a>3.1.12.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1"></a>3.1.12.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > CfnJob.ProfileConfigurationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.ProfileConfigurationProperty       |

**Description:** Configuration for profile jobs.

Configuration can be used to select columns, do evaluations, and override default parameters of evaluations. When configuration is undefined, the profile job will apply default settings to all supported columns.

| Property                                                                                                                     | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [columnStatisticsConfigurations](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations ) | No      | Combination | No         | -          | List of configurations for column evaluations.<br /><br />ColumnStatisticsConfigurations are used to select evaluations and override parameters of evaluations for particular columns. When ColumnStatisticsConfigurations is undefined, the profile job will profile all supported columns and run all supported evaluations. |
| - [datasetStatisticsConfiguration](#jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration ) | No      | Combination | No         | -          | Configuration for inter-column evaluations.<br /><br />Configuration can be used to select evaluations and override parameters of evaluations. When configuration is undefined, the profile job will run all supported inter-column evaluations.                                                                               |
| - [entityDetectorConfiguration](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration )       | No      | Combination | No         | -          | Configuration of entity detection for a profile job.<br /><br />When undefined, entity detection is disabled.                                                                                                                                                                                                                  |
| - [profileColumns](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns )                                 | No      | Combination | No         | -          | List of column selectors.<br /><br />ProfileColumns can be used to select columns from the dataset. When ProfileColumns is undefined, the profile job will profile all supported columns.                                                                                                                                      |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations"></a>3.1.12.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** List of configurations for column evaluations.

ColumnStatisticsConfigurations are used to select evaluations and override parameters of evaluations for particular columns. When ColumnStatisticsConfigurations is undefined, the profile job will profile all supported columns and run all supported evaluations.

| Any of(Option)                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i0) |
| [item 1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1)      |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i0"></a>3.1.12.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1"></a>3.1.12.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1`

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
| [item 1 items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_11"></a>3.1.12.2.1.2.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i0)                                  |
| [CfnJob.ColumnStatisticsConfigurationProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i0"></a>3.1.12.2.1.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1"></a>3.1.12.2.1.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > CfnJob.ColumnStatisticsConfigurationProperty`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | No                                                         |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")    |
| **Defined in**            | #/definitions/CfnJob.ColumnStatisticsConfigurationProperty |

**Description:** Configuration for column evaluations for a profile job.

ColumnStatisticsConfiguration can be used to select evaluations and override parameters of evaluations for particular columns.

| Property                                                                                                                                    | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [selectors](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors )   | No      | Combination | No         | -          | List of column selectors.<br /><br />Selectors can be used to select columns from the dataset. When selectors are undefined, configuration will be applied to all supported columns. |
| + [statistics](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics ) | No      | Combination | No         | -          | Configuration for evaluations.<br /><br />Statistics can be used to select evaluations and override parameters of evaluations.                                                       |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors"></a>3.1.12.2.1.2.1.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** List of column selectors.

Selectors can be used to select columns from the dataset. When selectors are undefined, configuration will be applied to all supported columns.

| Any of(Option)                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i0) |
| [item 1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1)      |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i0"></a>3.1.12.2.1.2.1.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1"></a>3.1.12.2.1.2.1.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1`

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

| Each item of this array must be                                                                                                                          | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_12"></a>3.1.12.2.1.2.1.2.1.2.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i0)                   |
| [CfnJob.ColumnSelectorProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i0"></a>3.1.12.2.1.2.1.2.1.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1"></a>3.1.12.2.1.2.1.2.1.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1 > item 1 items > anyOf > CfnJob.ColumnSelectorProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.ColumnSelectorProperty             |

**Description:** Selector of a column from a dataset for profile job configuration.

One selector includes either a column name or a regular expression.

| Property                                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------- |
| - [name](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1_name )   | No      | string | No         | -          | The name of a column from a dataset.                        |
| - [regex](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1_regex ) | No      | string | No         | -          | A regular expression for selecting a column from a dataset. |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1_name"></a>3.1.12.2.1.2.1.2.1.2.1.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1 > item 1 items > anyOf > item 1 > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of a column from a dataset.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1_regex"></a>3.1.12.2.1.2.1.2.1.2.1.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > selectors > anyOf > item 1 > item 1 items > anyOf > item 1 > regex`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A regular expression for selecting a column from a dataset.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics"></a>3.1.12.2.1.2.1.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Configuration for evaluations.

Statistics can be used to select evaluations and override parameters of evaluations.

| Any of(Option)                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i0)                            |
| [CfnJob.StatisticsConfigurationProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i0"></a>3.1.12.2.1.2.1.2.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1"></a>3.1.12.2.1.2.1.2.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > CfnJob.StatisticsConfigurationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.StatisticsConfigurationProperty    |

**Description:** Configuration of evaluations for a profile job.

This configuration can be used to select evaluations and override the parameters of selected evaluations.

| Property                                                                                                                                                                        | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| - [includedStatistics](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_includedStatistics ) | No      | array of string | No         | -          | List of included evaluations.<br /><br />When the list is undefined, all supported evaluations will be included. |
| - [overrides](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides )                   | No      | Combination     | No         | -          | List of overrides for evaluations.                                                                               |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_includedStatistics"></a>3.1.12.2.1.2.1.2.2.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > includedStatistics`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of included evaluations.

When the list is undefined, all supported evaluations will be included.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                                          | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [includedStatistics items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_includedStatistics_items) | -           |

###### <a name="autogenerated_heading_13"></a>3.1.12.2.1.2.1.2.2.2.1.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > includedStatistics > includedStatistics items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides"></a>3.1.12.2.1.2.1.2.2.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** List of overrides for evaluations.

| Any of(Option)                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i0) |
| [item 1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1)      |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i0"></a>3.1.12.2.1.2.1.2.2.2.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1"></a>3.1.12.2.1.2.1.2.2.2.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1`

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

| Each item of this array must be                                                                                                                                              | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_14"></a>3.1.12.2.1.2.1.2.2.2.2.2.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i0)                      |
| [CfnJob.StatisticOverrideProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i0"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > CfnJob.StatisticOverrideProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.StatisticOverrideProperty          |

**Description:** Override of a particular evaluation for a profile job.

| Property                                                                                                                                                                                          | Pattern | Type        | Deprecated | Definition | Title/Description                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------ |
| + [parameters](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters ) | No      | Combination | No         | -          | A map that includes overrides of an evaluation’s parameters. |
| + [statistic](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_statistic )   | No      | string      | No         | -          | The name of an evaluation.                                   |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > item 1 > parameters`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A map that includes overrides of an evaluation’s parameters.

| Any of(Option)                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters_anyOf_i0)           |
| [Record<string,string>](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters_anyOf_i0"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > item 1 > parameters > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_parameters_anyOf_i1"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > item 1 > parameters > anyOf > Record<string,string>`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/Record<string,string>                                       |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1_overrides_anyOf_i1_items_anyOf_i1_statistic"></a>3.1.12.2.1.2.1.2.2.2.2.2.1.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > columnStatisticsConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > statistics > anyOf > item 1 > overrides > anyOf > item 1 > item 1 items > anyOf > item 1 > statistic`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of an evaluation.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration"></a>3.1.12.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > datasetStatisticsConfiguration`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Configuration for inter-column evaluations.

Configuration can be used to select evaluations and override parameters of evaluations. When configuration is undefined, the profile job will run all supported inter-column evaluations.

| Any of(Option)                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration_anyOf_i0)                            |
| [CfnJob.StatisticsConfigurationProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration_anyOf_i0"></a>3.1.12.2.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > datasetStatisticsConfiguration > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_datasetStatisticsConfiguration_anyOf_i1"></a>3.1.12.2.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > datasetStatisticsConfiguration > anyOf > CfnJob.StatisticsConfigurationProperty`

|                           |                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                                                  |
| **Required**              | No                                                                                                                                                                                                                                                                        |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                                                                                   |
| **Same definition as**    | [jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_statistics_anyOf_i1) |

**Description:** Configuration of evaluations for a profile job.

This configuration can be used to select evaluations and override the parameters of selected evaluations.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration"></a>3.1.12.2.3. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Configuration of entity detection for a profile job.

When undefined, entity detection is disabled.

| Any of(Option)                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i0)                                |
| [CfnJob.EntityDetectorConfigurationProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i0"></a>3.1.12.2.3.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1"></a>3.1.12.2.3.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > CfnJob.EntityDetectorConfigurationProperty`

|                           |                                                          |
| ------------------------- | -------------------------------------------------------- |
| **Type**                  | `object`                                                 |
| **Required**              | No                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")  |
| **Defined in**            | #/definitions/CfnJob.EntityDetectorConfigurationProperty |

**Description:** Configuration of entity detection for a profile job.

When undefined, entity detection is disabled.

| Property                                                                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [allowedStatistics](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics ) | No      | Combination     | No         | -          | Configuration of statistics that are allowed to be run on columns that contain detected entities.<br /><br />When undefined, no statistics will be computed on columns that contain detected entities.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [entityTypes](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_entityTypes )             | No      | array of string | No         | -          | Entity types to detect. Can be any of the following:.<br /><br />- USA_SSN<br />- EMAIL<br />- USA_ITIN<br />- USA_PASSPORT_NUMBER<br />- PHONE_NUMBER<br />- USA_DRIVING_LICENSE<br />- BANK_ACCOUNT<br />- CREDIT_CARD<br />- IP_ADDRESS<br />- MAC_ADDRESS<br />- USA_DEA_NUMBER<br />- USA_HCPCS_CODE<br />- USA_NATIONAL_PROVIDER_IDENTIFIER<br />- USA_NATIONAL_DRUG_CODE<br />- USA_HEALTH_INSURANCE_CLAIM_NUMBER<br />- USA_MEDICARE_BENEFICIARY_IDENTIFIER<br />- USA_CPT_CODE<br />- PERSON_NAME<br />- DATE<br /><br />The Entity type group USA_ALL is also supported, and includes all of the above entity types except PERSON_NAME and DATE. |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics"></a>3.1.12.2.3.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > allowedStatistics`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Configuration of statistics that are allowed to be run on columns that contain detected entities.

When undefined, no statistics will be computed on columns that contain detected entities.

| Any of(Option)                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i0)                      |
| [CfnJob.AllowedStatisticsProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i0"></a>3.1.12.2.3.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > allowedStatistics > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i1"></a>3.1.12.2.3.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > allowedStatistics > anyOf > CfnJob.AllowedStatisticsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.AllowedStatisticsProperty          |

**Description:** Configuration of statistics that are allowed to be run on columns that contain detected entities.

When undefined, no statistics will be computed on columns that contain detected entities.

| Property                                                                                                                                             | Pattern | Type            | Deprecated | Definition | Title/Description                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------- |
| + [statistics](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i1_statistics ) | No      | array of string | No         | -          | One or more column statistics to allow for columns that contain detected entities. |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i1_statistics"></a>3.1.12.2.3.2.1.2.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > allowedStatistics > anyOf > item 1 > statistics`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** One or more column statistics to allow for columns that contain detected entities.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [statistics items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_allowedStatistics_anyOf_i1_statistics_items) | -           |

###### <a name="autogenerated_heading_15"></a>3.1.12.2.3.2.1.2.1.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > allowedStatistics > anyOf > item 1 > statistics > statistics items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_entityTypes"></a>3.1.12.2.3.2.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > entityTypes`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** Entity types to detect. Can be any of the following:.

- USA_SSN
- EMAIL
- USA_ITIN
- USA_PASSPORT_NUMBER
- PHONE_NUMBER
- USA_DRIVING_LICENSE
- BANK_ACCOUNT
- CREDIT_CARD
- IP_ADDRESS
- MAC_ADDRESS
- USA_DEA_NUMBER
- USA_HCPCS_CODE
- USA_NATIONAL_PROVIDER_IDENTIFIER
- USA_NATIONAL_DRUG_CODE
- USA_HEALTH_INSURANCE_CLAIM_NUMBER
- USA_MEDICARE_BENEFICIARY_IDENTIFIER
- USA_CPT_CODE
- PERSON_NAME
- DATE

The Entity type group USA_ALL is also supported, and includes all of the above entity types except PERSON_NAME and DATE.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                      | Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [entityTypes items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_entityDetectorConfiguration_anyOf_i1_entityTypes_items) | -           |

###### <a name="autogenerated_heading_16"></a>3.1.12.2.3.2.2.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > entityDetectorConfiguration > anyOf > item 1 > entityTypes > entityTypes items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns"></a>3.1.12.2.4. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** List of column selectors.

ProfileColumns can be used to select columns from the dataset. When ProfileColumns is undefined, the profile job will profile all supported columns.

| Any of(Option)                                                                                  |
| ----------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i0) |
| [item 1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1)      |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i0"></a>3.1.12.2.4.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1"></a>3.1.12.2.4.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns > anyOf > item 1`

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

| Each item of this array must be                                                                        | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| [item 1 items](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_17"></a>3.1.12.2.4.2.1. root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1_items_anyOf_i0)                   |
| [CfnJob.ColumnSelectorProperty](#jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1_items_anyOf_i0"></a>3.1.12.2.4.2.1.1. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_profileConfiguration_anyOf_i1_profileColumns_anyOf_i1_items_anyOf_i1"></a>3.1.12.2.4.2.1.2. Property `root > jobs > additionalProperties > profileConfiguration > anyOf > item 1 > profileColumns > anyOf > item 1 > item 1 items > anyOf > CfnJob.ColumnSelectorProperty`

|                           |                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                                                                                                               |
| **Same definition as**    | [jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1](#jobs_additionalProperties_profileConfiguration_anyOf_i1_columnStatisticsConfigurations_anyOf_i1_items_anyOf_i1_selectors_anyOf_i1_items_anyOf_i1) |

**Description:** Selector of a column from a dataset for profile job configuration.

One selector includes either a column name or a regular expression.

#### <a name="jobs_additionalProperties_projectName"></a>3.1.13. Property `root > jobs > additionalProperties > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_recipe"></a>3.1.14. Property `root > jobs > additionalProperties > recipe`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataset](#jobs_additionalProperties_dataset)           |

#### <a name="jobs_additionalProperties_schedule"></a>3.1.15. Property `root > jobs > additionalProperties > schedule`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ConfigSchedule                            |

| Property                                                                | Pattern | Type            | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [cronExpression](#jobs_additionalProperties_schedule_cronExpression ) | No      | string          | No         | -          | -                 |
| - [jobNames](#jobs_additionalProperties_schedule_jobNames )             | No      | array of string | No         | -          | -                 |
| + [name](#jobs_additionalProperties_schedule_name )                     | No      | string          | No         | -          | -                 |

##### <a name="jobs_additionalProperties_schedule_cronExpression"></a>3.1.15.1. Property `root > jobs > additionalProperties > schedule > cronExpression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="jobs_additionalProperties_schedule_jobNames"></a>3.1.15.2. Property `root > jobs > additionalProperties > schedule > jobNames`

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

| Each item of this array must be                                      | Description |
| -------------------------------------------------------------------- | ----------- |
| [jobNames items](#jobs_additionalProperties_schedule_jobNames_items) | -           |

###### <a name="autogenerated_heading_18"></a>3.1.15.2.1. root > jobs > additionalProperties > schedule > jobNames > jobNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="jobs_additionalProperties_schedule_name"></a>3.1.15.3. Property `root > jobs > additionalProperties > schedule > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="jobs_additionalProperties_timeout"></a>3.1.16. Property `root > jobs > additionalProperties > timeout`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="jobs_additionalProperties_type"></a>3.1.17. Property `root > jobs > additionalProperties > type`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="jobs_additionalProperties_validationConfigurations"></a>3.1.18. Property `root > jobs > additionalProperties > validationConfigurations`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                              |
| --------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_validationConfigurations_anyOf_i0) |
| [item 1](#jobs_additionalProperties_validationConfigurations_anyOf_i1)      |

##### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i0"></a>3.1.18.1. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i1"></a>3.1.18.2. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > item 1`

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

| Each item of this array must be                                                    | Description |
| ---------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#jobs_additionalProperties_validationConfigurations_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_19"></a>3.1.18.2.1. root > jobs > additionalProperties > validationConfigurations > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i0)                            |
| [CfnJob.ValidationConfigurationProperty](#jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1) |

###### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i0"></a>3.1.18.2.1.1. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                       |
| **Same definition as**    | [datasets_additionalProperties_formatOptions_anyOf_i0](#datasets_additionalProperties_formatOptions_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1"></a>3.1.18.2.1.2. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > item 1 > item 1 items > anyOf > CfnJob.ValidationConfigurationProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnJob.ValidationConfigurationProperty    |

**Description:** Configuration for data quality validation.

Used to select the Rulesets and Validation Mode to be used in the profile job. When ValidationConfiguration is null, the profile job will run without data quality validation.

| Property                                                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [rulesetArn](#jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1_rulesetArn )         | No      | string | No         | -          | The Amazon Resource Name (ARN) for the ruleset to be validated in the profile job.<br /><br />The TargetArn of the selected ruleset should be the same as the Amazon Resource Name (ARN) of the dataset that is associated with the profile job. |
| - [validationMode](#jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1_validationMode ) | No      | string | No         | -          | Mode of data quality validation.<br /><br />Default mode is “CHECK_ALL” which verifies all rules defined in the selected ruleset.                                                                                                                |

###### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1_rulesetArn"></a>3.1.18.2.1.2.1. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > rulesetArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon Resource Name (ARN) for the ruleset to be validated in the profile job.

The TargetArn of the selected ruleset should be the same as the Amazon Resource Name (ARN) of the dataset that is associated with the profile job.

###### <a name="jobs_additionalProperties_validationConfigurations_anyOf_i1_items_anyOf_i1_validationMode"></a>3.1.18.2.1.2.2. Property `root > jobs > additionalProperties > validationConfigurations > anyOf > item 1 > item 1 items > anyOf > item 1 > validationMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Mode of data quality validation.

Default mode is “CHECK_ALL” which verifies all rules defined in the selected ruleset.

## <a name="kmsArn"></a>4. Property `root > kmsArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="nag_suppressions"></a>5. Property `root > nag_suppressions`

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

### <a name="nag_suppressions_by_path"></a>5.1. Property `root > nag_suppressions > by_path`

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

#### <a name="autogenerated_heading_20"></a>5.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

##### <a name="nag_suppressions_by_path_items_path"></a>5.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>5.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

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

###### <a name="autogenerated_heading_21"></a>5.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>5.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>5.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectBucket"></a>6. Property `root > projectBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectName"></a>7. Property `root > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectTopicArn"></a>8. Property `root > projectTopicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="recipes"></a>9. Property `root > recipes`

|                           |                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                          |
| **Required**              | No                                                                                                                |
| **Additional properties** | [[Should-conform]](#recipes_additionalProperties "Each additional property must conform to the following schema") |

| Property                             | Pattern | Type   | Deprecated | Definition                   | Title/Description |
| ------------------------------------ | ------- | ------ | ---------- | ---------------------------- | ----------------- |
| - [](#recipes_additionalProperties ) | No      | object | No         | In #/definitions/RecipeProps | -                 |

### <a name="recipes_additionalProperties"></a>9.1. Property `root > recipes > RecipeProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/RecipeProps                               |

| Property                                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#recipes_additionalProperties_description ) | No      | string | No         | -          | -                 |
| + [steps](#recipes_additionalProperties_steps )             | No      | string | No         | -          | -                 |

#### <a name="recipes_additionalProperties_description"></a>9.1.1. Property `root > recipes > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="recipes_additionalProperties_steps"></a>9.1.2. Property `root > recipes > additionalProperties > steps`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityConfigurationName"></a>10. Property `root > securityConfigurationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>11. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>11.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>11.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>11.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>11.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>11.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>11.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>11.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>11.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>11.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>11.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_22"></a>11.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>11.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>11.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>11.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>11.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>11.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>11.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_23"></a>11.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>11.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>11.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>11.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>11.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>11.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>11.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>11.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>11.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>11.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>11.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:37 -0400
