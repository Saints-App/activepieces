import { createAction, Property } from '@activepieces/pieces-framework';
import { postgresAuth } from '../..';
import { pgClient } from '../common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Message, messages, messagesContent, User } from '../dbSchemas';

export const sendInAppMessages = createAction({
  auth: postgresAuth,
  name: 'sendInAppMessages',
  displayName: 'Send in-app messages',
  description: 'Send in-app messages to multiple users',
  props: {
    users: Property.Json({
      displayName: 'Users',
      description: 'Array of users to send the message',
      required: true
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
    campaignId: Property.ShortText({
      displayName: 'Campaign id',
      required: true,
    })
  },
  async run(context) {
    const { auth, propsValue } = context;
    const users: User[] = propsValue.users as unknown as User[]
    const messagecontentId: number = propsValue.messageId
    const campaignId: string = propsValue.campaignId

    const client = await pgClient(auth as any);
    const db = drizzle(client)
    const messagesToSend: Message[] = users.map(user => ({
      userId: user.id,
      createdAt: new Date(),
      contentId: messagecontentId,
      deliveredAt: null,
      readedAt: null,
      campaignId
    }))
    await db.insert(messages).values(messagesToSend)
  },
});
