-- =====================================================
-- FIXED ROW LEVEL SECURITY POLICIES SECTION
-- =====================================================
-- Run this section separately to fix the policy conflicts

-- First, let's check what policies currently exist and drop them properly
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing dispute policies
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'disputes' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.disputes', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;

    -- Drop all existing withdrawal_requests policies  
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'withdrawal_requests' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.withdrawal_requests', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Now create the new policies with unique names
-- Enhanced dispute policies
CREATE POLICY "admin_can_update_all_disputes_v2" ON public.disputes
FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "admin_can_view_all_disputes_v2" ON public.disputes
FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "users_can_view_own_disputes_v2" ON public.disputes
FOR SELECT USING (auth.uid() = reported_by);

CREATE POLICY "users_can_insert_own_disputes_v2" ON public.disputes
FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Enhanced withdrawal request policies
CREATE POLICY "admin_can_process_withdrawal_requests_v2" ON public.withdrawal_requests
FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "admin_can_view_all_withdrawal_requests_v2" ON public.withdrawal_requests
FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Keep existing user policies for withdrawal requests
CREATE POLICY "users_can_view_own_withdrawal_requests_v2" ON public.withdrawal_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_withdrawal_requests_v2" ON public.withdrawal_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created successfully
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'disputes' AND schemaname = 'public';
    
    RAISE NOTICE 'Disputes table now has % policies', policy_count;
    
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'withdrawal_requests' AND schemaname = 'public';
    
    RAISE NOTICE 'Withdrawal requests table now has % policies', policy_count;
    
    RAISE NOTICE 'RLS policies updated successfully!';
END $$;