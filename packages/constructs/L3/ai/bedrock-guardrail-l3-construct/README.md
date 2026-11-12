# Bedrock Guardrail L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock Guardrails for content filtering and safety.

## Features

- **Content Filtering**: Support for multiple content filter types (hate, sexual, violence, etc.)
- **Contextual Grounding**: Grounding and relevance threshold controls
- **Denied Topics**: Block subjects outside the application's scope, such as investment advice
- **Word Filters**: Block custom words and phrases, and optionally the AWS-managed profanity list
- **Sensitive Information Filters**: Block or mask PII entities and custom regex matches, separately for prompts and responses
- **Detect-only Mode**: Per-direction `NONE` actions report detections without blocking, for tuning before enforcement
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
        outputStrength: 'HIGH',
      },
      sexual: {
        inputStrength: 'HIGH',
        outputStrength: 'HIGH',
      },
      violence: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM',
      },
    },
    contextualGroundingFilters: {
      grounding: 0.9,
      relevance: 0.8,
    },
  },
  kmsKey: myKmsKey,
  naming: naming,
});
```

## Configuration Options

### Guardrail Properties

- `description`: Optional description for the guardrail
- `contentFilters`: Content filter configurations (required; may be `{}` when another policy is set)
- `blockedInputMessaging`: Custom message for blocked inputs
- `blockedOutputsMessaging`: Custom message for blocked outputs
- `contextualGroundingFilters`: Grounding and relevance thresholds
- `sensitiveInformationFilters`: PII entity and regex filters
- `deniedTopics`: Topics to deny, evaluated in the order given
- `wordFilters`: Custom words and phrases, and the profanity list
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

### Per-direction Controls

Content filters, denied topics and word filters accept the same optional fields. Unset fields keep the Bedrock default.

- `inputAction` / `outputAction`: `BLOCK` (default) or `NONE`. `NONE` is detect-only: content passes and the detection is reported in the guardrail trace
- `inputEnabled` / `outputEnabled`: set `false` to skip evaluation of prompts or responses

On word filters the controls apply to every word and to the profanity list.

### Denied Topics

Each topic has a `name` (1-100 characters: letters, digits, spaces and `- _ ! ? .`), a `definition` (up to 200 characters), and up to five `examples` of up to 100 characters. Names must be unique. Up to 30 topics.

Write the definition as a statement of what the topic is, not as an instruction ("Block all ...") or a negation ("Anything except ..."). Use word filters, not topics, to catch specific names or terms. Bedrock evaluates topics in the order given, and the order can change the outcome for a borderline prompt.

### Word Filters

- `words`: up to 10,000 words or phrases of up to three words each. Matching is case-insensitive and whole-word, so `competitor` does not match `competitors`. Entries must be unique ignoring case
- `profanity`: `true` adds the AWS-managed profanity list

At least one of `words` or `profanity` is required. A match with action `BLOCK` returns the guardrail's blocked input or output message; there is no per-filter message.

The spacing between a phrase's words must match exactly, so `off the record` does not match a prompt with extra spaces, a tab or a line break between those words. The AWS documentation says consecutive whitespace counts as one space, but `ApplyGuardrail` matches the spacing exactly. Prefer single-word entries, which spacing cannot affect, and list each spacing of a phrase that you need to catch as its own entry: entries that differ only in spacing are separate filters, not duplicates. For a phrase whose meaning matters more than its exact wording, consider a denied topic, which evaluates meaning rather than text; AWS advises against using denied topics to catch specific words or names.

### Sensitive Information Filters

`piiEntities` and `regexes` entries pass through to Bedrock unchanged. `action` is required on every entry, even when `inputAction` and `outputAction` are both set. Actions are `BLOCK`, `ANONYMIZE` or `NONE`; `ANONYMIZE` on input lets a prompt that contains PII reach the model with the PII masked instead of being rejected. Entity types use the Bedrock names, for example `NAME`, `EMAIL` and `US_SOCIAL_SECURITY_NUMBER`.

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

### Denied Topics, Word Filters and PII Masking

```typescript
deniedTopics: [
  {
    name: 'Investment Advice',
    definition: 'Recommendations about buying, selling, or holding financial securities or other investments.',
    examples: ['Should I buy this stock?']
  },
  // Detect-only while the definition is tuned
  { name: 'Medical Diagnosis', definition: 'Identifying medical conditions from symptoms.', inputAction: 'NONE', outputAction: 'NONE' }
],
wordFilters: {
  words: ['CompetitorBrandX', 'off the record'],
  profanity: true
},
sensitiveInformationFilters: {
  piiEntities: [
    // Masked in prompts, blocked in responses
    { type: 'NAME', action: 'BLOCK', inputAction: 'ANONYMIZE', outputAction: 'BLOCK' },
    { type: 'US_SOCIAL_SECURITY_NUMBER', action: 'BLOCK' }
  ]
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
