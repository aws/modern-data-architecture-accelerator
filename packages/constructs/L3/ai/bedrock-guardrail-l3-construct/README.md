# Bedrock Guardrail L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock Guardrails for content filtering and safety.

## Features

- **Content Filtering**: Support for multiple content filter types (hate, sexual, violence, etc.)
- **Contextual Grounding**: Grounding and relevance threshold controls
- **Custom Messages**: Configurable blocked input/output messages
- **KMS Encryption**: Automatic encryption with customer-managed keys
- **Intervention Alarms**: (Optional) CloudWatch alarms on the guardrail's intervention count and/or rate, across every guardrail version
- **Flexible Configuration**: Support for all guardrail filter strengths

## Usage

```typescript
import { BedrockGuardrailL3Construct } from '@aws-mdaa/bedrock-guardrail-l3-construct';

const guardrail = new BedrockGuardrailL3Construct(this, 'MyGuardrail', {
  guardrailName: 'my-guardrail',
  guardrailConfig: {
    description: 'Content filtering guardrail',
    contentFilters: {
      hate: {
        inputStrength: 'HIGH',
        outputStrength: 'HIGH'
      },
      sexual: {
        inputStrength: 'HIGH',
        outputStrength: 'HIGH'
      },
      violence: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM'
      }
    },
    contextualGroundingFilters: {
      grounding: 0.9,
      relevance: 0.8
    }
  },
  kmsKey: myKmsKey,
  naming: naming
});
```

## Configuration Options

### Guardrail Properties
- `description`: Optional description for the guardrail
- `contentFilters`: Content filter configurations (required)
- `blockedInputMessaging`: Custom message for blocked inputs
- `blockedOutputsMessaging`: Custom message for blocked outputs
- `contextualGroundingFilters`: Grounding and relevance thresholds
- `interventionAlarm`: (Optional) Intervention alarm thresholds; requires the `alarmSettings` construct prop

### Construct Properties
- `guardrailName`, `guardrailConfig`, `kmsKey`, `naming`: the guardrail, its configuration, the KMS key encrypting it, and the resource naming
- `alarmSettings`: Notification topic ARN, period, evaluation periods, and optional `datapointsToAlarm` for the intervention alarms. Required when `guardrailConfig.interventionAlarm` is set. When `alarmNamePattern` is set, each alarm name must match it, so the topic's CloudWatch grants cover the alarms

### Intervention Alarms
Each threshold creates one CloudWatch alarm on a Metrics Insights query over the `AWS/Bedrock/Guardrails` `InvocationsIntervened` metric, aggregated across every version of the guardrail, `DRAFT` included:
- `countThreshold`: alarm when the number of interventions in one period exceeds this value
- `ratePercentThreshold`: alarm when the percentage of guardrail evaluations that intervened in one period exceeds this value (at least 0, below 100). One intervention in a period with a single evaluation is 100%, so on a low-traffic guardrail require several breaching periods with `datapointsToAlarm`, or use `countThreshold`

The period must be a multiple of 60 seconds, and period x evaluation periods must not exceed 3 hours, the window CloudWatch evaluates Metrics Insights alarms over. A period with no evaluations is treated as not breaching.

### Content Filter Types
- `hate`: Hate speech detection
- `sexual`: Sexual content detection
- `violence`: Violence content detection
- `insults`: Insult detection
- `misconduct`: Professional misconduct detection
- `promptAttack`: Prompt injection attack detection. Evaluated on inputs only, so `outputStrength` must be `NONE`; any other value is rejected at synth

### Filter Strengths
- `NONE`: No filtering in that direction
- `LOW`: Minimal filtering
- `MEDIUM`: Moderate filtering
- `HIGH`: Strict filtering

### Contextual Grounding Filters
- `grounding`: Threshold for grounding to source material (0.0 to 1.0)
- `relevance`: Threshold for relevance to the query (0.0 to 1.0)

## Example Configurations

### Basic Content Filtering
```typescript
contentFilters: {
  hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
  sexual: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
  violence: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' }
}
```

### Comprehensive Filtering
```typescript
contentFilters: {
  hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
  sexual: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
  violence: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
  insults: { inputStrength: 'LOW', outputStrength: 'LOW' },
  misconduct: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
  promptAttack: { inputStrength: 'HIGH', outputStrength: 'NONE' }
}
```

### With Contextual Grounding
```typescript
contextualGroundingFilters: {
  grounding: 0.9,  // High grounding requirement
  relevance: 0.8   // High relevance requirement
}
```

## Dependencies

- `@aws-mdaa/l3-construct`
- `@aws-mdaa/cloudwatch-constructs`
- `aws-cdk-lib`
- `constructs`