-- Workspace notification prefs + optional customer contact on orders

alter table workspaces
  add column if not exists notification_settings jsonb not null default '{}'::jsonb;

alter table store_orders
  add column if not exists customer_contact text;

comment on column workspaces.notification_settings is
  'Owner prefs: emailEnabled, telegramEnabled, telegramChatId, whatsappNotify';
