import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';
import { getCachedOrFetch } from '../cache/redis';

// ============================================================
// Groq Tools (OpenAI Format)
// ============================================================

export const GROQ_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: 'Get the current weather for a specific location.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state/country, e.g., "San Francisco, CA"',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentTime',
      description: 'Get the current time in a specific timezone.',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'The IANA timezone string, e.g., "America/Los_Angeles" or "UTC"',
          },
        },
        required: ['timezone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchWikipedia',
      description: 'Search Wikipedia for a summary of a topic.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The topic to search for, e.g., "Albert Einstein"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMapCoordinates',
      description: 'Get the latitude and longitude coordinates for a specific location or address.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location name or address, e.g., "Eiffel Tower, Paris"',
          },
        },
        required: ['location'],
      },
    },
  },
];

// ---- Tool Execution Logic ----

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'getWeather':
      return getCachedOrFetch(`weather:${args.location}`, () => getWeather(args.location as string), 3600);
    case 'getCurrentTime':
      return getCurrentTime(args.timezone as string); // Do not cache current time
    case 'searchWikipedia':
      return getCachedOrFetch(`wiki:${args.query}`, () => searchWikipedia(args.query as string), 86400);
    case 'getMapCoordinates':
      return getCachedOrFetch(`map:${args.location}`, () => getMapCoordinates(args.location as string), 86400);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Mock implementation for Weather
async function getWeather(location: string) {
  await new Promise((r) => setTimeout(r, 400)); // simulate network latency
  
  // Deterministic mock based on location string
  const locLower = location.toLowerCase();
  if (locLower.includes('new york')) {
    return { temperature: 72, conditions: 'Sunny', humidity: 45, location: 'New York, NY' };
  }
  if (locLower.includes('london')) {
    return { temperature: 60, conditions: 'Rainy', humidity: 80, location: 'London, UK' };
  }
  
  // Default fallback
  return { temperature: 68, conditions: 'Partly Cloudy', humidity: 50, location };
}

// Actual implementation for Time
async function getCurrentTime(timezone: string) {
  try {
    const time = new Date().toLocaleString('en-US', { timeZone: timezone });
    return { time, timezone };
  } catch (e) {
    return { error: `Invalid timezone: ${timezone}. Use IANA format like America/New_York` };
  }
}

// Actual implementation for Wikipedia
async function searchWikipedia(query: string) {
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(query)}`);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return { error: 'No results found' };
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return { error: 'No Wikipedia page found for this query' };
    
    return { title: pages[pageId].title, summary: pages[pageId].extract };
  } catch (e) {
    return { error: 'Failed to connect to Wikipedia' };
  }
}

// Actual implementation for Maps via Nominatim
async function getMapCoordinates(location: string) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
      headers: { 'User-Agent': 'VoiceAgentApp/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { 
        location: data[0].display_name, 
        latitude: parseFloat(data[0].lat), 
        longitude: parseFloat(data[0].lon) 
      };
    }
    return { error: 'Location not found on map' };
  } catch (e) {
    return { error: 'Failed to connect to Map API' };
  }
}
