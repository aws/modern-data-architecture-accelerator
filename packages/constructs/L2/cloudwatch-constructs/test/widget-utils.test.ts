import {
  buildWidgetLayout,
  createLogInsightsWidget,
  createMetricWidget,
  createTextWidget,
  createWidget,
  DashboardWidgetPropsType,
} from '../lib/widget-utils';
import { buildMetrics } from '../lib/metric-utils';

describe('createTextWidget', () => {
  test('creates text widget with required properties', () => {
    const widget = createTextWidget({
      markdown: '# Test Header',
    });

    expect(widget).toBeDefined();
    expect(widget.width).toBe(6);
    expect(widget.height).toBe(6);
  });

  test('throws error when markdown is missing', () => {
    expect(() => createTextWidget({})).toThrow('Text widgets require markdown property');
  });

  test('applies custom width and height', () => {
    const widget = createTextWidget({
      markdown: '# Test',
      width: 12,
      height: 4,
    });

    expect(widget.width).toBe(12);
    expect(widget.height).toBe(4);
  });
});

describe('createLogInsightsWidget', () => {
  test('creates log insights widget with required properties', () => {
    const widget = createLogInsightsWidget({
      logGroupNames: ['/aws/lambda/my-function'],
      queryString: 'fields @timestamp, @message',
    });

    expect(widget).toBeDefined();
  });

  test('throws error when logGroupNames is missing', () => {
    expect(() =>
      createLogInsightsWidget({
        queryString: 'fields @timestamp',
      }),
    ).toThrow('Log insights widgets require logGroupNames array');
  });

  test('throws error when logGroupNames is empty', () => {
    expect(() =>
      createLogInsightsWidget({
        logGroupNames: [],
        queryString: 'fields @timestamp',
      }),
    ).toThrow('Log insights widgets require logGroupNames array');
  });

  test('throws error when queryString is missing', () => {
    expect(() =>
      createLogInsightsWidget({
        logGroupNames: ['/aws/lambda/my-function'],
      }),
    ).toThrow('Log insights widgets require queryString property');
  });

  test('applies custom width and height', () => {
    const widget = createLogInsightsWidget({
      logGroupNames: ['/aws/lambda/my-function'],
      queryString: 'fields @timestamp',
      width: 24,
      height: 8,
    });

    expect(widget.width).toBe(24);
    expect(widget.height).toBe(8);
  });
});

describe('createMetricWidget', () => {
  test('creates metric widget with required properties', () => {
    const widget = createMetricWidget(
      {
        metrics: [
          {
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
          },
        ],
      },
      buildMetrics,
    );

    expect(widget).toBeDefined();
  });

  test('throws error when metrics is missing', () => {
    expect(() => createMetricWidget({}, buildMetrics)).toThrow('Metric widgets require metrics array');
  });

  test('throws error when metrics is empty', () => {
    expect(() =>
      createMetricWidget(
        {
          metrics: [],
        },
        buildMetrics,
      ),
    ).toThrow('Metric widgets require metrics array');
  });

  test('applies custom width, height, and period', () => {
    const widget = createMetricWidget(
      {
        metrics: [
          {
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
          },
        ],
        width: 12,
        height: 8,
        period: 60,
      },
      buildMetrics,
    );

    expect(widget.width).toBe(12);
    expect(widget.height).toBe(8);
  });
});

describe('createWidget', () => {
  test('creates text widget when type is text', () => {
    const widget = createWidget(
      {
        type: 'text',
        markdown: '# Test',
      },
      buildMetrics,
    );

    expect(widget).toBeDefined();
  });

  test('creates metric widget when type is metric', () => {
    const widget = createWidget(
      {
        type: 'metric',
        metrics: [
          {
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
          },
        ],
      },
      buildMetrics,
    );

    expect(widget).toBeDefined();
  });

  test('creates log insights widget when type is log_insights', () => {
    const widget = createWidget(
      {
        type: 'log_insights',
        logGroupNames: ['/aws/lambda/my-function'],
        queryString: 'fields @timestamp',
      },
      buildMetrics,
    );

    expect(widget).toBeDefined();
  });

  test('throws error for unsupported widget type', () => {
    expect(() =>
      createWidget(
        {
          type: 'invalid' as DashboardWidgetPropsType['type'],
        },
        buildMetrics,
      ),
    ).toThrow('Unsupported widget type: invalid');
  });
});

describe('buildWidgetLayout', () => {
  test('creates single row for widgets within 24 units', () => {
    const widgetProps = [
      { type: 'text' as const, markdown: '# Widget 1', width: 12 },
      { type: 'text' as const, markdown: '# Widget 2', width: 12 },
    ];

    const rows = buildWidgetLayout(widgetProps, (props: DashboardWidgetPropsType) => createWidget(props, buildMetrics));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });

  test('wraps to new row when exceeding 24 units', () => {
    const widgetProps = [
      { type: 'text' as const, markdown: '# Widget 1', width: 12 },
      { type: 'text' as const, markdown: '# Widget 2', width: 12 },
      { type: 'text' as const, markdown: '# Widget 3', width: 12 },
    ];

    const rows = buildWidgetLayout(widgetProps, (props: DashboardWidgetPropsType) => createWidget(props, buildMetrics));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(2); // First row: 12 + 12 = 24
    expect(rows[1]).toHaveLength(1); // Second row: 12
  });

  test('uses default width of 6 when not specified', () => {
    const widgetProps = [
      { type: 'text' as const, markdown: '# Widget 1' },
      { type: 'text' as const, markdown: '# Widget 2' },
      { type: 'text' as const, markdown: '# Widget 3' },
      { type: 'text' as const, markdown: '# Widget 4' },
      { type: 'text' as const, markdown: '# Widget 5' },
    ];

    const rows = buildWidgetLayout(widgetProps, (props: DashboardWidgetPropsType) => createWidget(props, buildMetrics));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(4); // First row: 6*4 = 24
    expect(rows[1]).toHaveLength(1); // Second row: 6
  });

  test('handles empty widget array', () => {
    const rows = buildWidgetLayout([], (props: DashboardWidgetPropsType) => createWidget(props, buildMetrics));

    expect(rows).toHaveLength(0);
  });

  test('handles single widget', () => {
    const widgetProps = [{ type: 'text' as const, markdown: '# Widget 1', width: 24 }];

    const rows = buildWidgetLayout(widgetProps, (props: DashboardWidgetPropsType) => createWidget(props, buildMetrics));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(1);
  });
});
