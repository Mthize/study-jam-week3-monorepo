import { pgTable, serial, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthCodes = pgTable('oauth_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});
