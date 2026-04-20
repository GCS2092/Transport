-- Migration pour ajouter ADMIN_ARCHIVE à l'enum notification_type
-- Exécuter cette requête sur la base de données

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ADMIN_ARCHIVE';
