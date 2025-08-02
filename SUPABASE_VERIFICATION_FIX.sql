-- =====================================================
-- FIXED VERIFICATION QUERIES SECTION
-- =====================================================
-- This fixes the column reference ambiguity error

-- Test the new functions work correctly
DO $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Test dispute statistics function
    SELECT * INTO stats_record FROM public.get_dispute_statistics();
    RAISE NOTICE 'Dispute Statistics - Total: %, Open: %, In Progress: %, Resolved: %', 
        stats_record.total_disputes, 
        stats_record.open_disputes, 
        stats_record.in_progress_disputes, 
        stats_record.resolved_disputes;

    -- Test withdrawal statistics function
    SELECT * INTO stats_record FROM public.get_withdrawal_statistics();
    RAISE NOTICE 'Withdrawal Statistics - Total: %, Pending: %, Approved: %, Completed: %', 
        stats_record.total_requests, 
        stats_record.pending_requests, 
        stats_record.approved_requests, 
        stats_record.completed_requests;
END $$;

-- Check if all new columns were added successfully (FIXED VERSION)
DO $$
DECLARE
    disputes_columns text[] := ARRAY['assigned_to', 'priority', 'admin_notes', 'resolution', 'updated_at'];
    withdrawal_columns text[] := ARRAY['request_notes', 'currency'];
    current_column text;
BEGIN
    -- Check disputes table columns
    RAISE NOTICE 'Checking disputes table columns...';
    FOREACH current_column IN ARRAY disputes_columns
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE information_schema.columns.table_name = 'disputes' 
            AND information_schema.columns.column_name = current_column
            AND information_schema.columns.table_schema = 'public'
        ) THEN
            RAISE NOTICE '✓ Disputes table: Column % added successfully', current_column;
        ELSE
            RAISE WARNING '✗ Disputes table: Column % was not added', current_column;
        END IF;
    END LOOP;

    -- Check withdrawal_requests table columns
    RAISE NOTICE 'Checking withdrawal_requests table columns...';
    FOREACH current_column IN ARRAY withdrawal_columns
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE information_schema.columns.table_name = 'withdrawal_requests' 
            AND information_schema.columns.column_name = current_column
            AND information_schema.columns.table_schema = 'public'
        ) THEN
            RAISE NOTICE '✓ Withdrawal requests table: Column % added successfully', current_column;
        ELSE
            RAISE WARNING '✗ Withdrawal requests table: Column % was not added', current_column;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 Admin features database verification completed!';
END $$;

-- Additional verification: Show table structures
DO $$
BEGIN
    RAISE NOTICE '📋 Current disputes table structure:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'disputes' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (nullable: %, default: %)', 
            rec.column_name, 
            rec.data_type, 
            rec.is_nullable, 
            COALESCE(rec.column_default, 'none');
    END LOOP;

    RAISE NOTICE '📋 Current withdrawal_requests table structure:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'withdrawal_requests' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (nullable: %, default: %)', 
            rec.column_name, 
            rec.data_type, 
            rec.is_nullable, 
            COALESCE(rec.column_default, 'none');
    END LOOP;
END $$;