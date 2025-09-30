#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Base URL for internal API calls
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Input schemas for tools
const ListCourtsInputSchema = z.object({});

const StartSingleCourtAutomationInputSchema = z.object({
  courtId: z.string().describe('The MongoDB ObjectId of the court to automate'),
  durationHours: z.number().min(1).max(24).describe('Duration of automation in hours (1-24)'),
});

const StartMultiCourtAutomationInputSchema = z.object({
  courtIds: z.array(z.string()).min(1).max(10).describe('Array of court IDs to automate'),
  durationHours: z.number().min(1).max(24).describe('Duration of automation in hours (1-24)'),
});

const StopAutomationInputSchema = z.object({});

const GetStatusInputSchema = z.object({});

const GetCourtDetailsInputSchema = z.object({
  courtId: z.string().optional().describe('Optional court ID to get details for specific court'),
});

// Utility function to make API calls
async function callAPI(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to call API ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'can-am-court-reservation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: List Available Courts
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_available_courts',
        description: 'Get a list of courts available for reservation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'start_single_court_automation',
        description: 'Start automation for a single court with 3 groups of 4 users rotating every 30 minutes',
        inputSchema: {
          type: 'object',
          properties: {
            courtId: {
              type: 'string',
              description: 'The MongoDB ObjectId of the court to automate',
            },
            durationHours: {
              type: 'number',
              minimum: 1,
              maximum: 24,
              description: 'Duration of automation in hours (1-24)',
            },
          },
          required: ['courtId', 'durationHours'],
        },
      },
      {
        name: 'start_multi_court_automation',
        description: 'Start automation for multiple courts simultaneously, each with separate user groups',
        inputSchema: {
          type: 'object',
          properties: {
            courtIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: 1,
              maxItems: 10,
              description: 'Array of court IDs to automate',
            },
            durationHours: {
              type: 'number',
              minimum: 1,
              maximum: 24,
              description: 'Duration of automation in hours (1-24)',
            },
          },
          required: ['courtIds', 'durationHours'],
        },
      },
      {
        name: 'stop_automation',
        description: 'Stop any currently running automation (single or multi-court)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_automation_status',
        description: 'Get current status of running automation including user groups, rotation times, and remaining duration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_court_details',
        description: 'Get detailed information about courts from the external Can-Am API',
        inputSchema: {
          type: 'object',
          properties: {
            courtId: {
              type: 'string',
              description: 'Optional court ID to get details for specific court',
            },
          },
        },
      },
    ],
  };
});

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_available_courts': {
        ListCourtsInputSchema.parse(args);
        const result = await callAPI('/list-courts');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_single_court_automation': {
        const parsed = StartSingleCourtAutomationInputSchema.parse(args);
        const result = await callAPI('/start-automation', 'POST', {
          courtId: parsed.courtId,
          durationHours: parsed.durationHours,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_multi_court_automation': {
        const parsed = StartMultiCourtAutomationInputSchema.parse(args);
        const result = await callAPI('/start-automation', 'POST', {
          courtIds: parsed.courtIds,
          durationHours: parsed.durationHours,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'stop_automation': {
        StopAutomationInputSchema.parse(args);
        const result = await callAPI('/stop-automation', 'POST');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_automation_status': {
        GetStatusInputSchema.parse(args);
        const result = await callAPI('/status');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_court_details': {
        const parsed = GetCourtDetailsInputSchema.parse(args);

        // Call the external Can-Am API directly for court details
        const externalApiUrl = 'https://queuesystem-be.onrender.com/api/courts/all';
        const response = await fetch(externalApiUrl, {
          method: 'GET',
          headers: {
            'accept': '*/*',
            'x-admin-password': 'canamadmin',
            'Referer': 'https://can-am.vercel.app/',
          },
        });

        if (!response.ok) {
          throw new Error(`External API call failed: ${response.status}`);
        }

        const data = await response.json();

        // Filter by courtId if provided
        let result = data;
        if (parsed.courtId) {
          const court = data.courts?.find((c: any) => c._id === parsed.courtId);
          result = court ? { success: true, court } : { success: false, error: 'Court not found' };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP communication
  console.error('Can-Am Court Reservation MCP Server is running...');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});