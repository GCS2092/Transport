DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'RESERVATION_CONFIRMED',
      'DRIVER_ASSIGNED',
      'REMINDER_J1',
      'REMINDER_H1',
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
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'REMINDER_H1'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'REMINDER_H1';
  END IF;
END $$;