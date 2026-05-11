/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GAIA v2 L3 Construct - Main export file
 *
 * This file exports all public interfaces and classes from the GAIA v2 L3 Construct,
 * providing a comprehensive GenAI accelerator for AWS deployments.
 */

// Main construct export
export * from './gaia-l3-construct';

// Component-specific property interfaces
export { ChatHistoryProps } from './chatbot-api/chat-history/chat-history';
export { UserFeedbackProps } from './chatbot-api/user-feedback/user-feedback';
export { AuthenticationProps } from './authentication/authentication';
export { EntraIdOIDCProps } from './authentication/authentication';
export { RestApiProps, RestApiAlarmConfig, AlarmThresholdConfig } from './chatbot-api/rest-api/rest-api';
export { WebSocketApiProps } from './chatbot-api/websocket-api/websocket-api';

// Service interruption components
export {
  ServiceInterruption,
  ServiceInterruptionProps,
  ServiceInterruptionConstructProps,
} from './chatbot-api/service-interruption/service-interruption';

// Data source configurations for different LLM providers
export { InvokeModelDataSourceProps } from './chatbot-api/websocket-api/datasource/bedrock-invoke-model/invoke-model-data-source';
export { BedrockRagDataSourceProps } from './chatbot-api/websocket-api/datasource/bedrock-rag/bedrock-rag-data-source';
export { CustomDataSourceProps } from './chatbot-api/websocket-api/datasource/custom/custom-data-source';

// UI component configurations
export { ClientUiProps } from './client-ui/client-ui';
export { AdminUiProps } from './admin-ui/admin-ui';

// WAF configuration
export { WafRulesProps } from './chatbot-api/waf/waf';
