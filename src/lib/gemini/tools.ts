// ============================================================
// Tool Declarations & Implementations
// ============================================================

import { ToolDeclaration, ToolExecutionResult } from '@/types';

// ---- Tool Declarations (for Gemini function calling) ----

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'get_weather',
    description:
      'Get the current weather conditions for a specified location including temperature, conditions, humidity, and wind speed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        location: {
          type: 'STRING',
          description: 'The city name or location, e.g., "Tokyo", "New York", "London"',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the web for current information on a topic. Returns summarized results.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The search query to look up',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_time',
    description:
      'Get the current date and time for a specified timezone or city.',
    parameters: {
      type: 'OBJECT',
      properties: {
        timezone: {
          type: 'STRING',
          description:
            'The timezone or city name, e.g., "America/New_York", "Asia/Tokyo", "Europe/London", or just a city name like "Paris"',
        },
      },
      required: ['timezone'],
    },
  },
  {
    name: 'calculate',
    description:
      'Perform mathematical calculations. Supports basic arithmetic, percentages, and common math operations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        expression: {
          type: 'STRING',
          description:
            'The mathematical expression to evaluate, e.g., "25 * 4 + 10", "sqrt(144)", "15% of 200"',
        },
      },
      required: ['expression'],
    },
  },
];

// ---- Tool Function Map (for Gemini config) ----

export const GEMINI_TOOLS = [
  {
    functionDeclarations: TOOL_DECLARATIONS,
  },
];

// ---- Tool Implementations ----

// City → timezone mapping for the get_time tool
const CITY_TIMEZONES: Record<string, string> = {
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'tokyo': 'Asia/Tokyo',
  'beijing': 'Asia/Shanghai',
  'shanghai': 'Asia/Shanghai',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'singapore': 'Asia/Singapore',
  'moscow': 'Europe/Moscow',
  'seoul': 'Asia/Seoul',
  'toronto': 'America/Toronto',
  'sao paulo': 'America/Sao_Paulo',
  'cairo': 'Africa/Cairo',
  'istanbul': 'Europe/Istanbul',
};

// Simulated weather data (in production, this would call a weather API)
function getWeatherData(location: string): Record<string, unknown> {
  // Generate deterministic but realistic-looking weather data based on location
  const hash = location
    .toLowerCase()
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const temp = 15 + (hash % 25); // 15-40°C range
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear', 'Overcast'];
  const condition = conditions[hash % conditions.length];
  const humidity = 30 + (hash % 50);
  const windSpeed = 5 + (hash % 25);

  return {
    location,
    temperature: { celsius: temp, fahrenheit: Math.round(temp * 9/5 + 32) },
    condition,
    humidity: `${humidity}%`,
    windSpeed: `${windSpeed} km/h`,
    feelsLike: { celsius: temp - 2 + (hash % 4), fahrenheit: Math.round((temp - 2 + (hash % 4)) * 9/5 + 32) },
    updatedAt: new Date().toISOString(),
  };
}

function getSearchResults(query: string): Record<string, unknown> {
  return {
    query,
    results: [
      {
        title: `Latest information about: ${query}`,
        snippet: `Here are the most relevant findings for "${query}". This is a simulated search result. In production, this would connect to a real search API like Google Custom Search or Brave Search.`,
        source: 'Web Search',
      },
    ],
    totalResults: 1,
    searchedAt: new Date().toISOString(),
    note: 'This is a demo search tool. Connect a real search API for production use.',
  };
}

function getTimeData(timezone: string): Record<string, unknown> {
  // Try to resolve city name to timezone
  const resolved = CITY_TIMEZONES[timezone.toLowerCase()] || timezone;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      dateStyle: 'full',
      timeStyle: 'long',
    });
    return {
      timezone: resolved,
      datetime: formatter.format(now),
      iso: now.toISOString(),
      timestamp: now.getTime(),
    };
  } catch {
    return {
      timezone,
      error: `Could not resolve timezone: ${timezone}`,
      suggestion: 'Try using IANA timezone format like "America/New_York" or a major city name.',
    };
  }
}

function calculateExpression(expression: string): Record<string, unknown> {
  try {
    // Handle percentage expressions
    let sanitized = expression
      .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, '($1/100)*$2')
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/pow\(([^,]+),\s*([^)]+)\)/gi, 'Math.pow($1,$2)')
      .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
      .replace(/pi/gi, 'Math.PI')
      .replace(/\^/g, '**');

    // Allow only safe math characters
    if (!/^[0-9+\-*/().%\s,Math.sqrtpowabsPI]+$/i.test(sanitized.replace(/Math\.\w+/g, ''))) {
      return { expression, error: 'Invalid expression. Only mathematical operations are allowed.' };
    }

    // eslint-disable-next-line no-eval
    const result = new Function(`return (${sanitized})`)();

    return {
      expression,
      result: typeof result === 'number' ? Number(result.toFixed(10)) : result,
      type: typeof result,
    };
  } catch (error) {
    return {
      expression,
      error: `Could not evaluate expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ---- Tool Executor ----

export async function executeTool(
  toolName: string,
  args: Record<string, string>,
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    let data: unknown;

    switch (toolName) {
      case 'get_weather':
        data = getWeatherData(args.location);
        break;
      case 'web_search':
        data = getSearchResults(args.query);
        break;
      case 'get_time':
        data = getTimeData(args.timezone);
        break;
      case 'calculate':
        data = calculateExpression(args.expression);
        break;
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
          executionTimeMs: Date.now() - startTime,
          timestamp: Date.now(),
        };
    }

    return {
      success: true,
      data,
      executionTimeMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      executionTimeMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}
