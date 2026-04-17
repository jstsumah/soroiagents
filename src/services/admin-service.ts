'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from './auth-service';
import type { User, Payment } from '@/lib/types';
import { logActivity } from './audit-log-service';

export const adminSetUserPassword = async (targetUid: string, newPassword: string): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();
    const caller = await getAuthenticatedUser();
    
    if (!caller) {
        throw new Error('The function must be called while authenticated.');
    }

    if (!targetUid || !newPassword) {
        throw new Error('The function must be called with "targetUid" and "newPassword" arguments.');
    }

    if (newPassword.length < 8) {
        throw new Error('The new password must be at least 8 characters long.');
    }

    // Check caller role
    const { data: callerData, error: callerError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', caller.uid)
        .single();

    if (callerError || !callerData) {
        throw new Error('Caller user profile does not exist.');
    }

    if (callerData.role !== 'Admin' && callerData.role !== 'Super Admin') {
        throw new Error('Only Admins and Super Admins can set user passwords.');
    }

    // Check target user
    const { data: targetUserData, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUid)
        .single();

    if (targetError || !targetUserData) {
        throw new Error('Target user profile does not exist in the database.');
    }

    // Permissions check
    if (callerData.role === 'Admin' && targetUserData.role === 'Super Admin') {
        throw new Error('An Admin cannot change a Super Admin\'s password.');
    }
    if (callerData.role === 'Super Admin' && targetUserData.role === 'Super Admin' && caller.uid !== targetUid) {
        throw new Error('A Super Admin cannot change another Super Admin\'s password.');
    }

    try {
        // Update password in Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUid, {
            password: newPassword
        });

        if (authError) throw authError;

        // Update profile
        await supabaseAdmin
            .from('profiles')
            .update({ password_reset_required: true })
            .eq('id', targetUid);

        await logActivity({
            userId: caller.uid,
            userName: callerData.name || 'Admin',
            action: 'auth.admin_set_password',
            details: { targetUid, targetName: targetUserData.name || 'N/A' }
        });
    } catch (error: any) {
        console.error('Error setting user password:', error);
        throw new Error(error.message || 'An internal error occurred while setting the user password.');
    }
};

export const deleteUser = async (uid: string): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();
    const caller = await getAuthenticatedUser();
    
    if (!caller) {
        throw new Error('The function must be called while authenticated.');
    }

    if (!uid) {
        throw new Error('The function must be called with a "uid" argument.');
    }

    if (caller.uid === uid) {
        throw new Error('You cannot delete your own account.');
    }

    const { data: callerData } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', caller.uid)
        .single();

    if (callerData?.role !== 'Super Admin' && callerData?.role !== 'Admin') {
        throw new Error('Only Admins and Super Admins can delete users.');
    }

    const { data: targetData } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();

    if (targetData?.role === 'Super Admin') {
        throw new Error('A Super Admin cannot be deleted.');
    }

    if (callerData?.role === 'Admin' && targetData?.role === 'Admin') {
        throw new Error('An Admin cannot delete another Admin.');
    }

    try {
        // Fetch user info before deletion for logging
        const { data: userData } = await supabaseAdmin
            .from('profiles')
            .select('name, email')
            .eq('id', uid)
            .single();

        // Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (authError) throw authError;

        // Profile deletion should be handled by ON DELETE CASCADE in DB if set up, 
        // but we'll do it explicitly if needed.
        await supabaseAdmin.from('profiles').delete().eq('id', uid);

        await logActivity({
            userId: caller.uid,
            userName: callerData?.name || 'Admin',
            action: 'user.delete',
            details: { deletedUserId: uid, deletedUserName: userData?.name, deletedUserEmail: userData?.email }
        });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        throw new Error(error.message || 'An internal error occurred while deleting the user.');
    }
};

export const updateUserPassword = async (newPassword: string): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();
    const caller = await getAuthenticatedUser();
    
    if (!caller) {
        throw new Error('The function must be called while authenticated.');
    }

    if (!newPassword || newPassword.length < 8) {
        throw new Error('A valid password (min 8 chars) is required.');
    }

    try {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(caller.uid, {
            password: newPassword
        });

        if (authError) throw authError;

        await supabaseAdmin
            .from('profiles')
            .update({ password_reset_required: false })
            .eq('id', caller.uid);

        const { data: userData } = await supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', caller.uid)
            .single();

        await logActivity({
            userId: caller.uid,
            userName: userData?.name || 'N/A',
            action: 'auth.force_password_change',
            details: { reason: 'Initial login' }
        });
    } catch (error: any) {
        console.error('Error updating password:', error);
        throw new Error(error.message || 'Could not update password.');
    }
};

export const extendSubscription = async (): Promise<any> => {
    const supabaseAdmin = getSupabaseAdmin();
    const caller = await getAuthenticatedUser();
    
    if (!caller) {
        throw new Error('The function must be called while authenticated.');
    }

    try {
        const paymentDate = new Date();
        const paymentDateISO = paymentDate.toISOString();

        // Get current settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'companyDetails')
            .single();

        if (settingsError) throw settingsError;

        const companyDetails = settings.value || {};
        const currentRenewalDate = companyDetails.subscriptionRenewalDate ? new Date(companyDetails.subscriptionRenewalDate) : paymentDate;
        
        // Stacking logic: if already active, add 1 year to current expiry.
        // If expired, add 1 year to the payment date (today).
        const baseDate = currentRenewalDate > paymentDate ? currentRenewalDate : paymentDate;
        const newRenewalDate = new Date(baseDate);
        newRenewalDate.setFullYear(baseDate.getFullYear() + 1);

        const newRenewalDateISO = newRenewalDate.toISOString();
        companyDetails.subscriptionRenewalDate = newRenewalDateISO;

        // Update settings
        const { error: updateError } = await supabaseAdmin
            .from('settings')
            .update({ value: companyDetails })
            .eq('key', 'companyDetails');

        if (updateError) throw updateError;

        // Add payment record using the exact SAME timestamp as the base for renewal
        const paymentRecord = {
            created_at: paymentDateISO,
            description: "Pro Plan - Yearly Subscription Renewal",
            amount: 360.00,
            status: 'Paid',
            user_id: caller.uid,
            transaction_id: `manual-renewal-${paymentDate.getTime()}`
        };

        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert([paymentRecord]);

        if (paymentError) throw paymentError;

        return { success: true, newRenewalDate: newRenewalDateISO };
    } catch(error: any) {
        console.error("Error extending subscription:", error);
        throw new Error(error.message || 'Failed to extend subscription.');
    }
};
