import { pgTable, uuid, timestamp, pgEnum, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { events } from './events';
import { users } from './users';

export const eventParticipantStatusEnum = pgEnum('event_participant_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const eventParticipants = pgTable('event_participants', {
  eventId: uuid('event_id').references(() => events.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  
  status: eventParticipantStatusEnum('status').default('APPROVED').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),

  // For SHARED_COST events:
  weight: integer('weight').default(1).notNull(), // Part de la dépense (ex: 1 part, 2 parts...)
}, (t) => [
  primaryKey({ columns: [t.eventId, t.userId] }),
]);

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
  user: one(users, { fields: [eventParticipants.userId], references: [users.id] }),
}));
