/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Default Lambda timeout in seconds for GAIA API handlers.
 *
 * Set to 600 seconds (10 minutes) because:
 * - Bedrock model invocations can take significant time for complex prompts
 * - RAG operations involve retrieval + generation which compounds latency
 * - Streaming responses need time to complete the full response
 * - API Gateway has a 29-second timeout, but Lambda behind AppSync/WebSocket can run longer
 * - 10 minutes provides headroom for retries and edge cases without hitting Lambda's 15-minute max
 *
 * Users can override this via lambdaTimeoutInSeconds in their configuration.
 */
export const DEFAULT_LAMBDA_TIMEOUT_SECONDS = 600;

/**
 * Default Lambda memory size in MB for GAIA API handlers.
 *
 * Set to 1024 MB because:
 * - Bedrock SDK operations require reasonable memory for request/response handling
 * - Lambda CPU allocation scales with memory (1024 MB = ~0.5 vCPU)
 * - Provides good balance between performance and cost
 * - Sufficient for most RAG and model invocation workloads
 *
 * Users can override this via lambdaMemorySize in their configuration.
 */
export const DEFAULT_LAMBDA_MEMORY_SIZE_MB = 1024;

// =============================================================================
// Service Interruption Defaults
// =============================================================================

/**
 * Default cache TTL in seconds for service interruption status checks.
 *
 * Set to 30 seconds to balance:
 * - Responsiveness: Changes to interruption status propagate within 30 seconds
 * - Performance: Reduces DynamoDB calls by ~99% under normal load
 * - Cost: Minimizes read capacity consumption on the interruption table
 *
 * Lower values = faster propagation but more DynamoDB reads.
 * Higher values = fewer reads but slower response to status changes.
 */
export const DEFAULT_INTERRUPTION_CACHE_TTL_SECONDS = '30';

/**
 * Default fallback behavior when DynamoDB is unavailable.
 *
 * Set to 'false' (service continues normally) because:
 * - Fail-open is safer for availability — users can still use the service
 * - DynamoDB failures are rare and usually transient
 * - Interruption feature is for planned maintenance, not emergency shutdowns
 *
 * Set to 'true' for fail-safe mode where service shows interruption message on DB errors.
 */
export const DEFAULT_INTERRUPTION_FALLBACK_ENABLED = 'false';

/**
 * Default message shown when service interruption fallback is triggered.
 *
 * This message is displayed when:
 * - FALLBACK_ENABLED is 'true' AND DynamoDB is unavailable
 * - Provides a user-friendly message while the system recovers
 */
export const DEFAULT_INTERRUPTION_FALLBACK_MESSAGE = 'Service temporarily unavailable. Please try again later.';
