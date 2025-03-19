import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('saints_users', {
    id: serial('id').primaryKey(),
    deviceId: text('device_id').notNull(),
    trackAcceptedDate: timestamp('track_accepted_date', { withTimezone: true }),
    notificationsAcceptedDate: timestamp('notifications_accepted_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    platform: varchar('platform', { length: 10 }),
    lastIp: varchar('last_ip', { length: 40 }),
    lastLocation: text('last_location'),
});

export type User = InferSelectModel<typeof users>

export const messagesContent = pgTable("saints_messages_content", {
    id: serial("id").primaryKey().notNull(),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type MessageContent = InferSelectModel<typeof messagesContent>

export const messages = pgTable("saints_messages", {
    userId: integer("user_id")
        .notNull(),
    contentId: integer("content_id")
        .notNull()
        .references(() => messagesContent.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readedAt: timestamp("readed_at", { withTimezone: true }),
    campaignId: text("campaign_id")
});

export type Message = InferSelectModel<typeof messages>