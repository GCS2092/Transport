-- truncate_except_core.sql
DO
$$
DECLARE
    tbl RECORD;
    tables_to_keep TEXT[] := ARRAY[
        'drivers',
        'zones',
        'tariffs',
        'contacts',
        'users',
        'faqs'
    ];
BEGIN
    -- Boucle sur toutes les tables publiques
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Vérifie si la table n'est pas dans la liste à garder
        IF NOT tbl.tablename = ANY(tables_to_keep) THEN
            -- Exécute le TRUNCATE avec CASCADE
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl.tablename);
        END IF;
    END LOOP;
END
$$;
















