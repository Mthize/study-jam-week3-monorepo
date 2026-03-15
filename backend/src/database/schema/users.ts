import { pgTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    surname: varchar('surname', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    authProvider: varchar('auth_provider', { length: 50 }).default('local').notNull(),
    providerId: varchar('provider_id', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 1024 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    providerUnique: uniqueIndex('users_provider_unique').on(table.authProvider, table.providerId),
  }),
);
