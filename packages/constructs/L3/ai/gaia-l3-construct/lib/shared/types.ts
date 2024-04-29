import * as sagemaker from "aws-cdk-lib/aws-sagemaker";

export type ModelProvider = "sagemaker" | "bedrock" | "openai";

export enum SupportedSageMakerModels {
  FALCON_LITE = "FalconLite",
  LLAMA2_13B_CHAT = "Llama2_13b_Chat",
  MISTRAL7B_INSTRUCT2 = "Mistral7b_Instruct2",
}

export enum SupportedAuthTypes {
  EMAIL_PASSWORD = "email_pass",
  ACTIVE_DIRECTORY = "ad",
  EXISTING_POOL = 'existing'
}

export enum SupportedRegion {
  AF_SOUTH_1 = "af-south-1",
  AP_EAST_1 = "ap-east-1",
  AP_NORTHEAST_1 = "ap-northeast-1",
  AP_NORTHEAST_2 = "ap-northeast-2",
  AP_NORTHEAST_3 = "ap-northeast-3",
  AP_SOUTH_1 = "ap-south-1",
  AP_SOUTH_2 = "ap-south-2",
  AP_SOUTHEAST_1 = "ap-southeast-1",
  AP_SOUTHEAST_2 = "ap-southeast-2",
  AP_SOUTHEAST_3 = "ap-southeast-3",
  AP_SOUTHEAST_4 = "ap-southeast-4",
  CA_CENTRAL_1 = "ca-central-1",
  EU_CENTRAL_1 = "eu-central-1",
  EU_CENTRAL_2 = "eu-central-2",
  EU_NORTH_1 = "eu-north-1",
  EU_SOUTH_1 = "eu-south-1",
  EU_SOUTH_2 = "eu-south-2",
  EU_WEST_1 = "eu-west-1",
  EU_WEST_2 = "eu-west-2",
  EU_WEST_3 = "eu-west-3",
  IL_CENTRAL_1 = "il-central-1",
  ME_CENTRAL_1 = "me-central-1",
  ME_SOUTH_1 = "me-south-1",
  SA_EAST_1 = "sa-east-1",
  US_EAST_1 = "us-east-1",
  US_EAST_2 = "us-east-2",
  US_WEST_1 = "us-west-1",
  US_WEST_2 = "us-west-2",
}

export enum ModelInterface {
  LANG_CHAIN = "langchain",
}

export enum Modality {
  TEXT = "TEXT",
  EMBEDDING = "EMBEDDING",
}

export enum Direction {
  IN = "IN",
  OUT = "OUT",
}

export interface VpcProps {
    readonly vpcId: string;
    readonly dataSubnets: string[]
    readonly dataSecurityGroupId: string
    readonly appSubnets: string[]
    readonly appSecurityGroupId: string
}

export interface CodeOverwritesProps {
  readonly restApiHandlerCodePath?: string
  readonly ragEnginesInferenceCodePath?: string
  readonly commonLibsLayerCodeZipPath?: string
  readonly genAiCoreLayerCodePath?: string
  readonly pgVectorDbSetupCodePath?: string
  readonly createAuroraWorkspaceCodePath?: string
  readonly dataImportUploadHandlerCodePath?: string
  readonly websiteParserCodePath?: string
  readonly deleteWorkspaceHandlerCodePath?: string
  readonly webSocketConnectionHandlerCodePath?: string
  readonly webSocketAuthorizerFunctionCodePath?: string
  readonly webSocketIncomingMessageHandlerCodePath?: string
  readonly webSocketOutgoingMessageHandlerCodePath?: string
  readonly langchainInterfaceHandlerCodePath?: string
}

export interface AuthProps {
  readonly authType: SupportedAuthTypes;
  readonly cognitoDomain?: string;
  readonly idpSamlMetadataUrlOrFileParamPath?: string;
  readonly idpSamlEmailClaimParamPath?: string;
  readonly oAuthRedirectUrl?: string;
  readonly existingPoolId?: string;
  readonly existingPoolClientId?: string;
  readonly existingPoolDomain?: string;
}

export interface BedrockProps {
  readonly enabled: boolean;
  readonly region: SupportedRegion;
  readonly roleArn?: string;
}

export interface SagemakerLlmModelConfig {
  readonly model: SupportedSageMakerModels
  readonly instanceType?: string
  readonly initialInstanceCount?: number
  readonly minimumInstanceCount?: number
  readonly maximumInstanceCount?: number
}

export interface LlmsProps {
  readonly huggingFaceApiToken?: string
  readonly sagemaker: SagemakerLlmModelConfig[];
}

export interface AuroraEngineProps {

}


export interface KendraExternalProps {
  readonly name: string;
  readonly kendraId: string;
  readonly region?: SupportedRegion;
  readonly roleArn?: string;
}

export interface KendraS3DataSourceConfigProps {
  readonly bucketName: string;
  readonly kmsKeyArn: string;
  readonly includedDirectories: string[];
  readonly metadataDirectory?: string
}

export interface KendraEngineProps {
  readonly createIndex: boolean;
  readonly s3DataSourceConfig?: KendraS3DataSourceConfigProps;
  readonly external?: KendraExternalProps[];
}

export interface SagemakerRagProps {
  readonly instanceType?: string;
  readonly minInstanceCount?: number;
  readonly maxInstanceCount?: number;
  readonly initialInstanceCount?: number
}

export interface EngineProps {
  readonly sagemaker?: SagemakerRagProps
  readonly aurora?: AuroraEngineProps;
  readonly kendra?: KendraEngineProps ;
}

export interface ModelProps {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly dimensions: number;
  readonly isDefault?: boolean;
}

export interface CrossEncoderModelProps {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly isDefault?: boolean;
}

export interface RagProps {
  readonly engines: EngineProps
  readonly embeddingsModels: ModelProps[];
  readonly crossEncoderModels: CrossEncoderModelProps[];
}

export interface BackendApisProps {
  readonly restApiDomainName: string;
  readonly hostedZoneName: string;
  readonly socketApiDomainName: string;
}

export interface SystemConfig {
  readonly prefix: string
  readonly mainDomain?: string
  readonly vpc: VpcProps
  readonly auth: AuthProps
  readonly bedrock?: BedrockProps
  readonly llms: LlmsProps
  readonly rag?: RagProps
  readonly api?: BackendApisProps
  readonly setApiGateWayAccountCloudwatchRole?: boolean
  readonly skipApiGatewayDefaultWaf?: boolean
  readonly codeOverwrites?: CodeOverwritesProps
}

export interface SageMakerLLMEndpoint {
  readonly name: string;
  readonly endpoint: sagemaker.CfnEndpoint;
}

export interface SageMakerModelEndpoint {
  readonly name: string;
  readonly endpoint: sagemaker.CfnEndpoint;
  readonly responseStreamingSupported: boolean;
  readonly inputModalities: Modality[];
  readonly outputModalities: Modality[];
  readonly modelInterface: ModelInterface;
  readonly ragSupported: boolean;
}
