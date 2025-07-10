# Bedrock Guardrail L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock Guardrails for content filtering and safety.

## Features

- **Content Filtering**: Support for multiple content filter types (hate, sexual, violence, etc.)
- **Contextual Grounding**: Grounding and relevance threshold controls
- **Custom Messages**: Configurable blocked input/output messages
- **KMS Encryption**: Automatic encryption with customer-managed keys
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

### Content Filter Types
- `hate`: Hate speech detection
- `sexual`: Sexual content detection
- `violence`: Violence content detection
- `insults`: Insult detection
- `misconduct`: Professional misconduct detection
- `promptAttack`: Prompt injection attack detection

### Filter Strengths
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
  promptAttack: { inputStrength: 'HIGH', outputStrength: 'HIGH' }
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
- `aws-cdk-lib`
- `constructs`