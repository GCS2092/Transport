-- Migration pour ajouter REMINDER_H1 à l'enum notification_type
-- Exécuter cette requête sur la base de données

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REMINDER_H1';

