-- Migration pour ajouter ADMIN_UNPAID_RIDE à l'enum notification_type
-- Exécuter cette requête sur la base de données

-- PostgreSQL: ALTER TYPE avec ADD VALUE
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ADMIN_UNPAID_RIDE';

-- Si l'approche ci-dessus ne fonctionne pas (PostgreSQL < 9.6 ou contraintes),
-- utiliser la méthode de création d'un nouveau type :

/*
-- Méthode alternative (si nécessaire):
BEGIN;

-- Créer le nouveau type
CREATE TYPE notification_type_new AS ENUM (
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
);

-- Mettre à jour la table email_logs
ALTER TABLE email_logs ALTER COLUMN notification_type TYPE notification_type_new 
  USING notification_type::text::notification_type_new;

-- Supprimer l'ancien type et renommer le nouveau
DROP TYPE notification_type;
ALTER TYPE notification_type_new RENAME TO notification_type;

COMMIT;
*/
