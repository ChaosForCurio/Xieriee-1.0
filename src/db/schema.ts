import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
    id: serial('id').primaryKey(),
    chatId: text('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
    role: text('role').notNull(), // 'user' or 'ai'
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
