import 'zod-openapi/extend';
import { z } from 'zod';

export const MonitorQuerySchema = z.object({
  start: z.string().optional().openapi({
    description: 'Start time in milliseconds',
    example: '1704067200000'
  }),
  end: z.string().optional().openapi({
    description: 'End time in milliseconds',
    example: '1704085200000'
  }),
  step: z.string().optional().openapi({
    description: 'Query step interval (e.g., "2m", "5m", "1h")',
    example: '2m'
  })
}).openapi({
  title: 'Monitor Query Parameters',
  description: 'Query parameters for monitoring data. If not provided, defaults to last 3 hours with 2 minutes interval.'
});

export const MonitorResponseSchema = z.array(
  z.object({
    type: z.enum(['cpu', 'memory']).openapi({
      description: 'Monitor type'
    }),
    name: z.string().openapi({
      description: 'Pod name'
    }),
    xData: z.array(z.number()).openapi({
      description: 'Timestamp array'
    }),
    yData: z.array(z.string()).openapi({
      description: 'Value array'
    })
  })
).openapi({
  title: 'Monitor Response',
  description: 'Monitor data response containing CPU and Memory metrics'
});

