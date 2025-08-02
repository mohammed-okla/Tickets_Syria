-- =====================================================
-- TICKETS E-WALLET - ADMIN FEATURES DATABASE UPDATES
-- =====================================================
-- This file contains database schema updates needed to support
-- the enhanced admin features including dispute resolution and
-- withdrawal management systems
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. DISPUTES TABLE ENHANCEMENTS
-- =====================================================

-- Add missing columns to disputes table for full admin functionality
DO $$ 
BEGIN
    -- Add assigned_to column for dispute assignment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.disputes 
        ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add priority column for dispute prioritization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'priority') THEN
        ALTER TABLE public.disputes 
        ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
    END IF;

    -- Add admin_notes column for internal admin notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.disputes 
        ADD COLUMN admin_notes text;
    END IF;

    -- Add resolution column for dispute resolution details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'resolution') THEN
        ALTER TABLE public.disputes 
        ADD COLUMN resolution text;
    END IF;

    -- Add updated_at column for tracking last modification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'updated_at') THEN
        ALTER TABLE public.disputes 
        ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- =====================================================
-- 2. WITHDRAWAL REQUESTS TABLE ENHANCEMENTS
-- =====================================================

-- Add missing columns to withdrawal_requests table
DO $$ 
BEGIN
    -- Add request_notes column for user's notes on withdrawal request
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'request_notes') THEN
        ALTER TABLE public.withdrawal_requests 
        ADD COLUMN request_notes text;
    END IF;

    -- Ensure currency column exists (in case it's missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'currency') THEN
        ALTER TABLE public.withdrawal_requests 
        ADD COLUMN currency character varying(3) NOT NULL DEFAULT 'SYP';
    END IF;
END $$;

-- =====================================================
-- 3. ENHANCED DATABASE FUNCTIONS
-- =====================================================

-- Function to update dispute status and assignment
CREATE OR REPLACE FUNCTION public.update_dispute_status(
    p_dispute_id uuid,
    p_admin_id uuid,
    p_status text DEFAULT NULL,
    p_assigned_to uuid DEFAULT NULL,
    p_priority text DEFAULT NULL,
    p_admin_notes text DEFAULT NULL,
    p_resolution text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dispute public.disputes;
BEGIN
    -- Check if dispute exists
    SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Dispute not found'::text;
        RETURN;
    END IF;

    -- Verify admin has permission to update disputes
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND user_type = 'admin' AND is_active = true) THEN
        RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::text;
        RETURN;
    END IF;

    -- Update dispute with provided values
    UPDATE public.disputes 
    SET 
        status = COALESCE(p_status, status),
        assigned_to = COALESCE(p_assigned_to, assigned_to),
        priority = COALESCE(p_priority, priority),
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        resolution = COALESCE(p_resolution, resolution),
        resolved_at = CASE 
            WHEN p_status IN ('resolved', 'closed') AND resolved_at IS NULL 
            THEN NOW() 
            ELSE resolved_at 
        END,
        updated_at = NOW()
    WHERE id = p_dispute_id;

    RETURN QUERY SELECT true, 'Dispute updated successfully'::text;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error updating dispute: ' || SQLERRM;
END;
$$;

-- Function to process withdrawal requests
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
    p_request_id uuid,
    p_admin_id uuid,
    p_status public.withdrawal_status,
    p_admin_notes text DEFAULT NULL,
    p_processing_fee numeric DEFAULT 0.00
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request public.withdrawal_requests;
    v_final_amount numeric;
BEGIN
    -- Check if withdrawal request exists
    SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Withdrawal request not found'::text;
        RETURN;
    END IF;

    -- Verify admin has permission to process withdrawals
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND user_type = 'admin' AND is_active = true) THEN
        RETURN QUERY SELECT false, 'Unauthorized: Admin access required'::text;
        RETURN;
    END IF;

    -- Calculate final amount
    v_final_amount := v_request.amount - p_processing_fee;

    -- Update withdrawal request
    UPDATE public.withdrawal_requests 
    SET 
        status = p_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        processing_fee = p_processing_fee,
        final_amount = v_final_amount,
        processed_by = p_admin_id,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- If approved and user has sufficient balance, deduct from wallet
    IF p_status = 'approved' THEN
        -- Check user balance
        IF (SELECT balance FROM public.wallets WHERE user_id = v_request.user_id) >= v_request.amount THEN
            -- Deduct amount from user wallet
            UPDATE public.wallets 
            SET balance = balance - v_request.amount
            WHERE user_id = v_request.user_id;
            
            -- Create transaction record
            INSERT INTO public.transactions (
                from_user_id, 
                amount, 
                transaction_type, 
                status, 
                description,
                reference_id
            ) VALUES (
                v_request.user_id,
                v_request.amount,
                'withdrawal',
                'completed',
                'Withdrawal approved: ' || p_request_id,
                p_request_id
            );
        ELSE
            RETURN QUERY SELECT false, 'Insufficient balance for withdrawal'::text;
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Withdrawal request processed successfully'::text;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error processing withdrawal: ' || SQLERRM;
END;
$$;

-- Function to get dispute statistics
CREATE OR REPLACE FUNCTION public.get_dispute_statistics()
RETURNS TABLE(
    total_disputes bigint,
    open_disputes bigint,
    in_progress_disputes bigint,
    resolved_disputes bigint,
    high_priority_disputes bigint,
    avg_resolution_days numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_disputes,
        COUNT(*) FILTER (WHERE status = 'open') as open_disputes,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_disputes,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_disputes,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_disputes,
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) 
            FILTER (WHERE resolved_at IS NOT NULL), 
            0
        )::numeric(10,2) as avg_resolution_days
    FROM public.disputes;
END;
$$;

-- Function to get withdrawal statistics
CREATE OR REPLACE FUNCTION public.get_withdrawal_statistics()
RETURNS TABLE(
    total_requests bigint,
    pending_requests bigint,
    approved_requests bigint,
    completed_requests bigint,
    rejected_requests bigint,
    total_amount numeric,
    pending_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount
    FROM public.withdrawal_requests;
END;
$$;

-- =====================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Indexes for disputes table enhancements
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to ON public.disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON public.disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_updated_at ON public.disputes(updated_at);

-- Additional indexes for withdrawal requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processed_by ON public.withdrawal_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_currency ON public.withdrawal_requests(currency);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_disputes_status_priority ON public.disputes(status, priority);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_created ON public.withdrawal_requests(status, created_at);

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Drop existing policies if they exist and recreate with enhanced functionality
DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
DROP POLICY IF EXISTS "Dispute assigned admins can view" ON public.disputes;

-- Enhanced dispute policies
CREATE POLICY "Admins can update all disputes" ON public.disputes
FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Assigned admins can view their disputes" ON public.disputes
FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'admin' OR 
    (assigned_to = auth.uid() AND public.get_user_role(auth.uid()) = 'admin')
);

-- Enhanced withdrawal request policies
DROP POLICY IF EXISTS "Admins can process withdrawal requests" ON public.withdrawal_requests;

CREATE POLICY "Admins can process withdrawal requests" ON public.withdrawal_requests
FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update disputes updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_disputes_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for disputes updates
DROP TRIGGER IF EXISTS trg_update_disputes_updated_at ON public.disputes;
CREATE TRIGGER trg_update_disputes_updated_at
    BEFORE UPDATE ON public.disputes
    FOR EACH ROW EXECUTE FUNCTION public.update_disputes_updated_at_column();

-- =====================================================
-- 7. DEFAULT DATA AND MIGRATION
-- =====================================================

-- Set default priority for existing disputes
UPDATE public.disputes 
SET priority = 'medium' 
WHERE priority IS NULL;

-- Set default updated_at for existing disputes
UPDATE public.disputes 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- =====================================================
-- 8. REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for admin features
ALTER publication supabase_realtime ADD TABLE public.disputes;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

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

-- Check if all new columns were added successfully
DO $$
DECLARE
    disputes_columns text[] := ARRAY['assigned_to', 'priority', 'admin_notes', 'resolution', 'updated_at'];
    withdrawal_columns text[] := ARRAY['request_notes', 'currency'];
    current_column text;
    table_name text;
BEGIN
    -- Check disputes table columns
    FOREACH current_column IN ARRAY disputes_columns
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = current_column) THEN
            RAISE NOTICE 'Disputes table: Column % added successfully', current_column;
        ELSE
            RAISE WARNING 'Disputes table: Column % was not added', current_column;
        END IF;
    END LOOP;

    -- Check withdrawal_requests table columns
    FOREACH current_column IN ARRAY withdrawal_columns
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = current_column) THEN
            RAISE NOTICE 'Withdrawal requests table: Column % added successfully', current_column;
        ELSE
            RAISE WARNING 'Withdrawal requests table: Column % was not added', current_column;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Admin features database updates completed successfully!';
END $$;

-- =====================================================
-- 10. CLEANUP AND MAINTENANCE
-- =====================================================

-- Update table statistics for better query planning
ANALYZE public.disputes;
ANALYZE public.withdrawal_requests;

-- =====================================================
-- MANUAL STEPS REQUIRED:
-- =====================================================

/*
After running this SQL script, you may need to:

1. VERIFY FUNCTIONALITY:
   - Test dispute assignment and status updates
   - Test withdrawal request processing
   - Verify RLS policies work correctly for admins

2. MONITOR PERFORMANCE:
   - Check query performance with new indexes
   - Monitor realtime subscription load
   - Review database statistics after usage

3. CONFIGURE NOTIFICATIONS:
   - Set up notifications for high-priority disputes
   - Configure alerts for pending withdrawal requests
   - Implement email notifications for status changes

4. BACKUP STRATEGY:
   - Ensure backup includes new columns and data
   - Test restore procedures with enhanced schema
   - Document the new database structure

5. USER TRAINING:
   - Train admin users on new dispute resolution workflow
   - Provide guidance on withdrawal request processing
   - Document standard operating procedures
*/

-- =====================================================
-- END OF ADMIN FEATURES DATABASE UPDATES
-- =====================================================