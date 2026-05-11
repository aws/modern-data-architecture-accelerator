import { CfnIPSet, CfnLoggingConfiguration, CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

/**
 * WAF rule configuration with priority.
 *
 * Used by {@link WafProps.wafRules} in the parent GAIA configuration to
 * override the default priority of individual managed-rule groups, which is
 * required when combining multiple rule groups whose default priorities
 * would otherwise conflict.
 */
export interface WafRulesProps {
  /** Priority order for the WAF rule */
  readonly priority: number;
}

/**
 * Rate limiting configuration for DDoS protection.
 *
 * Rate-based rules help protect against DDoS attacks by automatically blocking
 * IP addresses that exceed a specified request threshold within a time window.
 *
 * @see https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
 *
 * @example
 * // Block IPs making more than 1000 requests per minute
 * rateLimit: {
 *   limit: 1000,
 *   evaluationWindowSec: 60,
 * }
 *
 * @example
 * // Default: Block IPs making more than 2000 requests per 5 minutes
 * rateLimit: {}
 */
export interface RateLimitConfig {
  /**
   * Maximum requests allowed per IP within the evaluation window.
   * When exceeded, the IP is blocked until the request rate drops below the limit.
   *
   * @default 2000
   * @minimum 10
   * @maximum 2000000000
   */
  readonly limit?: number;

  /**
   * Priority for the rate limit rule in the WAF rule evaluation order.
   * Lower numbers are evaluated first. Must be unique across all rules.
   * Note: IP allowlist rule uses priority 0.
   *
   * @default 1
   */
  readonly priority?: number;

  /**
   * Time window in seconds for counting requests.
   * AWS WAF counts requests within this sliding window to determine if the limit is exceeded.
   *
   * @default 300 (5 minutes)
   * @allowedValues 60, 120, 300, 600
   */
  readonly evaluationWindowSec?: 60 | 120 | 300 | 600;
}

export interface WAFProps extends MdaaL3ConstructProps {
  /** List of allowed CIDR blocks for IP-based access control */
  allowedCidrs?: string[];
  /** Custom WAF rules with priorities */
  wafRules?: { [key: string]: WafRulesProps };
  /** KMS key for encrypting WAF logs */
  encryptionKey: MdaaKmsKey;
  /** WAF scope - CLOUDFRONT for global, REGIONAL for API Gateway */
  wafScope: 'CLOUDFRONT' | 'REGIONAL';
  /** Prefix for WAF resource names */
  wafNamePrefix: string;
  /** Number of days to retain access logs in CloudWatch log group for access logs. If undefined, infinite is used. */
  readonly logGroupAccessLogRetentionDays?: number;
  /** Rate limiting configuration for DDoS protection. If undefined, rate limiting is disabled. */
  readonly rateLimit?: RateLimitConfig;
  /**
   * Enable CloudWatch metrics for the IP allowlist rule.
   *
   * By default, metrics are disabled for the IP allowlist rule to reduce CloudWatch costs,
   * since this rule fires on every allowed request (high volume). Blocking rules (rate limit,
   * managed rules) always have metrics enabled regardless of this setting.
   *
   * Enable this for full observability when debugging access issues or for compliance/audit requirements.
   *
   * @default false
   */
  readonly enableIpAllowRuleMetrics?: boolean;
  /**
   * Enable request sampling for the IP allowlist rule.
   *
   * By default, sampling is disabled for the IP allowlist rule to reduce costs,
   * since this rule fires on every allowed request (high volume). Blocking rules (rate limit,
   * managed rules) always have sampling enabled regardless of this setting.
   *
   * Enable this to capture sample requests for debugging or analysis.
   *
   * @default false
   */
  readonly enableIpAllowRuleSampling?: boolean;
}

/**
 * WAF construct that creates Web Application Firewall protection for GAIA resources.
 *
 * This construct creates:
 * - WAF Web ACL with configurable rules
 * - IP Set for allowed CIDR blocks (default deny, explicit allow)
 * - Rate-based rules for DDoS protection (optional)
 * - AWS Managed Rule Groups for common attack protection
 * - CloudWatch logging for security monitoring
 * - Metrics and sampling for analysis
 *
 * Security Features:
 * - Default deny policy (block all traffic not explicitly allowed)
 * - IP-based access control with CIDR allowlists
 * - Rate limiting to mitigate DDoS and brute-force attacks
 * - AWS Managed Rules for OWASP Top 10 protection
 * - Request sampling and metrics for monitoring
 * - Encrypted logging for compliance
 *
 * @see https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html
 * @see https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/aws-waf-rate-based-rules.html
 */
export class Waf extends MdaaL3Construct {
  /** WAF Web ACL for traffic filtering */
  readonly webACL: CfnWebACL;

  constructor(scope: Construct, id: string, props: WAFProps) {
    super(scope, id, props);

    // Build WAF rules array starting with IP allowlist
    const rules: CfnWebACL.RuleProperty[] = [];
    rules.push(this.configureIpSetRule(scope, props.wafNamePrefix, props));

    // Add rate limiting rule if configured (for DDoS protection)
    if (props.rateLimit) {
      rules.push(this.configureRateLimitRule(props.wafNamePrefix, props));
    }

    rules.push(...this.addUserConfiguredRules(props));

    // Create WAF Web ACL with default deny policy
    const cfnWebACL = new CfnWebACL(scope, `${props.wafNamePrefix}-default-waf`, {
      name: props.naming.resourceName(`${props.wafNamePrefix}-default-waf`, 128),
      defaultAction: {
        block: {}, // Default deny - only explicitly allowed traffic passes
      },
      scope: props.wafScope, // CLOUDFRONT for global, REGIONAL for API Gateway
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: props.naming.resourceName(`${props.wafNamePrefix}-default-waf`, 255),
        sampledRequestsEnabled: true, // Enable request sampling for analysis
      },
      rules: rules,
    });

    this.webACL = cfnWebACL;

    // Configure CloudWatch logging for security monitoring
    this.configureLogs(scope, props.wafNamePrefix, props, cfnWebACL);
  }

  /**
   * Creates IP Set rules for CIDR-based access control
   * This method creates separate IP sets for IPv4 and IPv6 addresses and combines them
   * using an OR statement. Traffic from any allowed IP range is permitted.
   *
   * @returns Array of rule properties (one combined rule if both IPv4 and IPv6 are present)
   */
  private configureIpSetRule(scope: Construct, wafNamePrefix: string, props: WAFProps) {
    // Warn if no CIDRs are configured - this will block ALL traffic due to default deny policy
    if (!props.allowedCidrs || props.allowedCidrs.length === 0) {
      console.warn(
        `[WAF WARNING] No allowedCidrs configured for ${wafNamePrefix}. ` +
          'With default deny policy, ALL traffic will be blocked. ' +
          'If this is intentional, you can ignore this warning.',
      );
    }

    // Separate IPv4 and IPv6 addresses
    // IPv6 addresses contain colons, IPv4 addresses contain dots
    const ipv4Addresses = (props.allowedCidrs || []).filter(cidr => !cidr.includes(':'));
    const ipv6Addresses = (props.allowedCidrs || []).filter(cidr => cidr.includes(':'));

    const ipSetStatements: CfnWebACL.StatementProperty[] = [];

    // Create IPv4 IP Set if there are IPv4 addresses
    if (ipv4Addresses.length > 0) {
      const ipv4AllowSet = new CfnIPSet(scope, `${wafNamePrefix}ipv4-allow-set`, {
        addresses: ipv4Addresses,
        ipAddressVersion: 'IPV4',
        scope: props.wafScope,
        name: props.naming.resourceName(`${wafNamePrefix}-ipv4-allow-set`, 255),
      });
      ipSetStatements.push({
        ipSetReferenceStatement: {
          arn: ipv4AllowSet.attrArn,
        },
      });
    }

    // Create IPv6 IP Set if there are IPv6 addresses
    if (ipv6Addresses.length > 0) {
      const ipv6AllowSet = new CfnIPSet(scope, `${wafNamePrefix}ipv6-allow-set`, {
        addresses: ipv6Addresses,
        ipAddressVersion: 'IPV6',
        scope: props.wafScope,
        name: props.naming.resourceName(`${wafNamePrefix}-ipv6-allow-set`, 255),
      });
      ipSetStatements.push({
        ipSetReferenceStatement: {
          arn: ipv6AllowSet.attrArn,
        },
      });
    }

    // Build the statement - use OR if both IPv4 and IPv6, single statement otherwise
    let statement: CfnWebACL.StatementProperty;
    if (ipSetStatements.length === 0) {
      // No addresses configured - create empty IPv4 set (will block all traffic)
      const emptyIpSet = new CfnIPSet(scope, `${wafNamePrefix}ip-allow-set`, {
        addresses: [],
        ipAddressVersion: 'IPV4',
        scope: props.wafScope,
        name: props.naming.resourceName(`${wafNamePrefix}-ip-allow-set`, 255),
      });
      statement = {
        ipSetReferenceStatement: {
          arn: emptyIpSet.attrArn,
        },
      };
    } else if (ipSetStatements.length === 1) {
      // Only one type of IP addresses
      statement = ipSetStatements[0];
    } else {
      // Both IPv4 and IPv6 - combine with OR
      statement = {
        orStatement: {
          statements: ipSetStatements,
        },
      };
    }

    // Create rule that allows traffic from IP Sets
    // Metrics and sampling disabled by default for allow rules to reduce costs (fires on every allowed request)
    // Users can enable individually for observability/debugging
    const ipAllowRuleProps: CfnWebACL.RuleProperty = {
      name: 'ipAllow',
      priority: 0, // Highest priority - evaluated first
      visibilityConfig: {
        cloudWatchMetricsEnabled: props.enableIpAllowRuleMetrics ?? false,
        metricName: props.naming.resourceName(`${wafNamePrefix}-ip-allow`, 255),
        sampledRequestsEnabled: props.enableIpAllowRuleSampling ?? false,
      },
      statement,
      action: {
        allow: {}, // Allow traffic from these IPs
      },
    };
    return ipAllowRuleProps;
  }

  /**
   * Creates rate-based rule for DDoS protection.
   *
   * This rule tracks requests per source IP and blocks IPs that exceed the configured
   * limit within the evaluation window. Blocked IPs receive a 403 Forbidden response
   * and remain blocked until their request rate drops below the threshold.
   *
   * @see https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
   */
  private configureRateLimitRule(wafNamePrefix: string, props: WAFProps): CfnWebACL.RuleProperty {
    const limit = props.rateLimit?.limit ?? 2000;
    const priority = props.rateLimit?.priority ?? 1;
    const evaluationWindowSec = props.rateLimit?.evaluationWindowSec ?? 300;

    return {
      name: 'RateLimitRule',
      priority: priority,
      statement: {
        rateBasedStatement: {
          limit: limit,
          aggregateKeyType: 'IP', // Rate limit per source IP address
          evaluationWindowSec: evaluationWindowSec,
        },
      },
      action: {
        block: {}, // Block IPs exceeding the limit
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${wafNamePrefix}-rate-limit`,
        sampledRequestsEnabled: true, // Sample blocked requests for analysis
      },
    };
  }

  /**
   * Adds user-configured AWS Managed Rule Groups
   * These provide protection against common web attacks (OWASP Top 10, etc.)
   */
  private addUserConfiguredRules(props: WAFProps) {
    const rules: CfnWebACL.RuleProperty[] = [];

    // Process each configured managed rule group
    for (const ruleName of Object.keys(props?.wafRules ?? {})) {
      const wafRule: WafRulesProps | undefined = props?.wafRules?.[ruleName];
      if (wafRule) {
        rules.push({
          name: ruleName,
          priority: wafRule.priority, // User-defined priority for rule evaluation order
          overrideAction: {
            none: {}, // Use rule group's default actions
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS', // AWS Managed Rules
              name: ruleName, // e.g., 'AWSManagedRulesCommonRuleSet'
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.wafNamePrefix}-${ruleName}`,
          },
        });
      }
    }
    return rules;
  }

  /**
   * Configures CloudWatch logging for WAF.
   * Logs are encrypted and retention is configurable (defaults to infinite if not specified).
   */
  private configureLogs(scope: Construct, wafNamePrefix: string, props: WAFProps, cfnWebACL: CfnWebACL) {
    // Create encrypted log group for WAF logs
    const defaultWafLogGroup = new MdaaLogGroup(scope, `${wafNamePrefix}-default-waf-log-group`, {
      logGroupName: `${wafNamePrefix}-default-waf`,
      encryptionKey: props.encryptionKey,
      // IMPORTANT: WAF log group names must start with 'aws-waf-logs-'
      // This is an AWS requirement for WAF logging destinations
      // https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html
      logGroupNamePathPrefix: 'aws-waf-logs-',
      retention: props.logGroupAccessLogRetentionDays ?? RetentionDays.INFINITE,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
    });

    // Configure WAF to send logs to CloudWatch
    new CfnLoggingConfiguration(scope, `${wafNamePrefix}-default-waf-logging-config`, {
      logDestinationConfigs: [defaultWafLogGroup.logGroupArn],
      resourceArn: cfnWebACL.attrArn,
      // CDK uses objectToCloudFormation (pass-through) for singleHeader in
      // CfnLoggingConfiguration.FieldToMatchProperty, so we must use CFN PascalCase directly.
      redactedFields: [
        { singleHeader: { Name: 'authorization' } },
        { singleHeader: { Name: 'x-origin-verify' } },
        { singleHeader: { Name: 'cookie' } },
      ],
    });
  }
}
