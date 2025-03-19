import { createAction, Property } from '@activepieces/pieces-framework';
import { messagesContent, users } from '../dbSchemas';
import { filterOperators } from '../utils';
import { postgresAuth } from '../../index';
import { pgClient } from '../common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';

const userKeys = [
  "id",
  "deviceId",
  "trackAcceptedDate",
  "notificationsAcceptedDate",
  "createdAt",
  "platform",
  "lastIp",
  "lastLocation",
] as const
const mutableKeys = [...userKeys];

const usersColumns = filterObject(users, mutableKeys)
const columnNames = Object.values(usersColumns).map(c => c.name)

const userColumnType: Record<string, z.ZodType<any>> = {
  id: z.number(),
  device_id: z.string(),
  track_accepted_date: z.coerce.date().optional(),
  notifications_accepted_date: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  platform: z.enum(["ios", "android"]),
  last_ip: z.string(),
  last_location: z.string(),
}

const usersZodSchema = z.array(z.object({
  column: z.string(),
  operator: z.enum(filterOperators),
  value: z.any(),
}).refine((data) => {
  if (columnNames.indexOf(data.column) === -1) {
    throw new Error(`Column not valid: ${data.column}`)
  }

  if (["isNotNull", "isNull"].indexOf(data.operator) !== -1) {
    return true
  }

  const columnSchema = userColumnType[data.column];
  columnSchema.parse(data.value);

  return true
}));

export const runCampaign = createAction({
  auth: postgresAuth,
  name: 'runCampaign',
  displayName: 'Run campaign',
  description: 'Define and run a user communication campaign',
  props: {
    filters: Property.Array({
      displayName: 'Filters',
      required: false,
      description: 'Array of filter conditions',
      defaultValue: [],
      properties: {
        column: Property.StaticDropdown({
          displayName: 'Column',
          required: true,
          options: {
            options: Object.values(usersColumns).map(column => {
              return {
                label: column.name,
                value: column.name
              }
            })
          }
        }),
        operator: Property.StaticDropdown({
          displayName: 'Operator',
          required: true,
          options: {
            options: filterOperators.map(op => ({
              label: op,
              value: op,
            }))
          }
        }),
        value: Property.ShortText({
          displayName: 'Value',
          required: false,
        }),
      }
    }),
    messageId: Property.Dropdown({
      displayName: 'Message',
      description: 'Select message to send',
      required: true,
      refreshers: ['auth'],
      refreshOnSearch: false,
      options: async ({ auth }) => {
        if (!auth) {
          return { options: [], disabled: true }
        }
        const client = await pgClient(auth as any);
        const db = drizzle(client)
        const messages = await db.select().from(messagesContent)
        return {
          options: messages.map(message => ({
            label: message.title,
            value: message.id
          })),
        };
      },
    }),
    campaignRunnerUrl: Property.ShortText({
      displayName: 'Campaign runner url',
      required: true
    })
  },
  async run(data) {
    const { filters, messageId, campaignRunnerUrl } = data.propsValue

    const parsedFilters = usersZodSchema.parse(filters)

    const response = await fetch(campaignRunnerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: parsedFilters,
        messageId,
        campaignId: data.run.id,
        page: 1,
      })
    })

    if (response.ok) {
      return `Campaign launched successfully (id: ${data.run.id})`
    } else {
      return response.text()
    }

  },
});


function filterObject<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keysToKeep: K[]
): Pick<T, K> {
  return keysToKeep.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}
