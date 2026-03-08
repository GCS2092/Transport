-- Migration pour ajouter ADMIN_UNPAID_RIDE au check constraint de email_logs
-- TypeORM utilise des CHECK constraints, pas des types PostgreSQL natifs

-- 1. D'abord, trouver le nom de la contrainte existante
-- \dt email_logs puis \d email_logs pour voir les contraintes

-- 2. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS CHK_email_logs_notificationType_enum;

-- 3. Recréer avec toutes les valeurs incluant ADMIN_UNPAID_RIDE
ALTER TABLE email_logs ADD CONSTRAINT CHK_email_logs_notificationType_enum 
CHECK ("notificationType" IN (
  'RESERVATION_CONFIRMED',
  'DRIVER_ASSIGNED', 
  'REMINDER_J1',
  'RIDE_STARTED',
  'RIDE_COMPLETED',
  'RESERVATION_CANCELLED',
  'DRIVER_NEW_RIDE',
  'DRIVER_RIDE_MODIFIED',
  'DRIVER_RIDE_CANCELLED',
  'DRIVER_REMINDER_J1',
  'ADMIN_NEW_RESERVATION',
  'ADMIN_DRIVER_ASSIGNED',
  'ADMIN_UNPAID_RIDE'
));

-- Alternative si le nom de colonne est différent (notification_type avec underscore):
-- ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS CHK_email_logs_notification_type_enum;
-- ALTER TABLE email_logs ADD CONSTRAINT CHK_email_logs_notification_type_enum 
-- CHECK (notification_type IN (...));

-- Pour vérifier le nom exact de la colonne:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'email_logs';
