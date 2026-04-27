'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { User, CreateUserDto } from '@/lib/types';
import { logActivity } from './audit-log-service';
import { getAuthenticatedUser } from './auth-service';
import { sendEmail } from './email-service';
import { getCompanyDetails } from './settings-service';
import { getEmailTemplateByEvent } from './email-template-service';
import { ensureAdmin, isAdmin } from './auth-service';

/**
 * Internal helper to fetch a user profile by ID using the admin client.
 * Does NOT perform authorization checks. Use with caution.
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
    if (!uid) return null;
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select(`
            *,
            companies (
                name
            )
        `)
        .eq('id', uid)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error(`Error fetching user profile ${uid}:`, error);
        }
        return null;
    }

    return data ? mapProfileToUser(data) : null;
};

export const getUser = async (uid: string): Promise<User | null> => {
    if (!uid) return null;

    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error('Unauthorized');

    // Only Admins can view other users' profiles
    if (authUser.uid !== uid && !(await isAdmin(authUser))) {
        throw new Error('Unauthorized: You can only view your own profile.');
    }

    return await getUserProfile(uid);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    // Note: Publicly accessible to support the two-step login flow.
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) return null;
    return data ? mapProfileToUser(data) : null;
};

export const getUsersByCompanyId = async (companyId: string): Promise<User[]> => {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error('Unauthorized');

    // Only Admins or users from the same company (if they have canViewUsers permission)
    if (authUser.companyId !== companyId && !(await isAdmin(authUser))) {
         throw new Error('Unauthorized');
    }

    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('company_id', companyId)
            .range(from, from + step - 1);
        
        if (error) {
            console.error('Error fetching users by company ID:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    return allData.map(mapProfileToUser);
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<{success: boolean, toastMessage?: string}> => {
    const profileData = mapUserToProfile(data);
    console.log('[updateUser] uid=', uid, 'data=', data, 'profileData=', profileData);

    // Handle approval logic & Security Check
    const authUser = await getAuthenticatedUser();
    
    // If attempting to change status to active (Approval)
    if (data.status === 'active') {
        if (!authUser || (authUser.role !== 'Admin' && authUser.role !== 'Super Admin')) {
            throw new Error('Unauthorized: Only Admins and Super Admins can approve agents.');
        }
        profileData.approved_by = authUser.uid;
        profileData.approved_at = new Date().toISOString();
    }
    
    // General security: Only admins can change Tier or Role
    if (data.tier || data.role) {
        if (!authUser || (authUser.role !== 'Admin' && authUser.role !== 'Super Admin')) {
             throw new Error('Unauthorized: Only Admins can modify User Tiers or Roles.');
        }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', uid);

    if (error) {
        console.error('Error updating user:', uid, error);
        throw error;
    }

    console.log('[updateUser] Success. uid=', uid, 'profileData=', profileData);

    try {
        const admin = await getAuthenticatedUser();
        if (admin) {
            const isActivation = data.status === 'active';
            await logActivity({
                userId: admin.uid,
                userName: admin.name,
                action: isActivation ? 'user.activate' : 'user.update',
                details: { updatedUserId: uid, updatedFields: Object.keys(data) }
            });
        }
    } catch (e) {
        console.error("Could not log user update activity:", e);
    }

    return { success: true };
};

export const createUser = async (data: CreateUserDto, patchIfExists: boolean = false) => {
    if (!data.password) throw new Error("Password is required");

    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    let isAdmin = false;
    if (currentUser) {
        const profile = await getUser(currentUser.id);
        isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';
    }

    const supabaseAdmin = getSupabaseAdmin();
    let authData: any;
    let authError: any;

    if (isAdmin) {
        // Use Admin API to avoid logging out the admin
        const adminCreateResult = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                name: data.name,
                role: data.role || 'Agent'
            }
        });
        authData = adminCreateResult.data;
        authError = adminCreateResult.error;
    } else {
        // 1. Try Primary: Supabase Auth signUp (for public registration)
        const signupResult = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                    role: data.role || 'Agent'
                }
            }
        });

        authData = signupResult.data;
        authError = signupResult.error;

        // 2. Fallback: If rate limit exceeded, use Admin API + MailerSend
        if (authError && (authError.message.includes('rate limit exceeded') || (authError as any).status === 429)) {
            console.warn('Supabase signUp rate limit hit, falling back to Admin API + MailerSend');
            const adminCreateResult = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: data.password,
                email_confirm: false,
                user_metadata: {
                    name: data.name,
                    role: data.role || 'Agent'
                }
            });
            authData = adminCreateResult.data;
            authError = adminCreateResult.error;

            if (!authError) {
                // Generate and send confirmation link manually... (rest of the logic preserved)
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'signup',
                    email: data.email,
                });
                if (!linkError) {
                    const link = linkData.properties.action_link;
                    const companyDetails = await getCompanyDetails();
                    try {
                        await sendEmail({
                            to: { email: data.email, name: data.name },
                            from: { email: companyDetails.contactEmail || 'noreply@example.com', name: companyDetails.companyName },
                            subject: `Confirm Your Account - ${companyDetails.companyName}`,
                            html: `<p>Welcome ${data.name}, confirm your email here: <a href="${link}">${link}</a></p>`,
                            text: `Welcome, confirm your email: ${link}`
                        });
                    } catch (e) {}
                }
            }
        }
    }

    // Lookup or Create company ID by name if not provided
    let finalCompanyId = data.companyId;
    if (!finalCompanyId && data.company) {
        const { data: companyMatch } = await supabaseAdmin
            .from('companies')
            .select('id')
            .ilike('name', data.company.trim())
            .maybeSingle();
        
        if (companyMatch) {
            finalCompanyId = companyMatch.id;
        } else {
            // Auto-create company if missing
            const { data: newCompany, error: createError } = await supabaseAdmin
                .from('companies')
                .insert({ name: data.company.trim() })
                .select('id')
                .single();
            
            if (!createError && newCompany) {
                finalCompanyId = newCompany.id;
            }
        }
    }

    // Handle "User already registered" error
    if (authError && (authError.message.includes('already been registered') || authError.message.includes('already registered'))) {
        const existingUser = await getUserByEmail(data.email);
        if (existingUser) {
            if (patchIfExists) {
                let hasChanges = false;
                
                // Re-mapping logic for patching - use the looked-up company ID
                const profileUpdates = mapUserToProfile({ ...data, companyId: finalCompanyId });
                const finalUpdates: any = {};
                for (const key in profileUpdates) {
                    if ((existingUser as any)[key] === null || (existingUser as any)[key] === undefined || String((existingUser as any)[key]).trim() === '') {
                         if (profileUpdates[key] !== undefined && profileUpdates[key] !== null && String(profileUpdates[key]).trim() !== '') {
                             finalUpdates[key] = profileUpdates[key];
                             hasChanges = true;
                         }
                    }
                }

                if (hasChanges) {
                    await supabaseAdmin.from('profiles').update(finalUpdates).eq('id', existingUser.uid);
                    return { uid: existingUser.uid, toastMessage: "User updated with missing info.", alreadyExists: true, updated: true };
                }
            }
            return { uid: existingUser.uid, toastMessage: "User already exists.", alreadyExists: true };
        }
        throw authError;
    }

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create auth user");

    const uid = authData.user.id;

    // 2. Update Profile
    const profileUpdate = mapUserToProfile({
        name: data.name,
        email: data.email,
        company: data.company,
        companyId: finalCompanyId, // Use the looked-up ID
        type: data.type,
        tier: data.tier,
        status: data.status,
        role: data.role,
        phone: data.phone,
        country: data.country,
        dmc: data.dmc,
        payment_terms: data.payment_terms,
        remarks: data.remarks,
        created_at: data.created_at,
        passwordResetRequired: data.passwordResetRequired ?? true
    });

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', uid);

    if (profileError) console.error('Error updating profile:', profileError);

    try {
        const admin = await getAuthenticatedUser();
        if (admin) {
            await logActivity({
                userId: admin.uid,
                userName: admin.name,
                action: 'user.create',
                details: { newUserId: uid, email: data.email, name: data.name, role: data.role }
            });
        }
    } catch (e) {}

    return { uid, toastMessage: "User created successfully" };
};

/**
 * Fallback for pre-existing users from old database.
 * If they exist in profiles but login fails, we try to ensure their auth account 
 * is set up with the password they just provided.
 */
export const attemptLegacyLoginFallback = async (email: string, password: string): Promise<boolean> => {
    if (!password) return false;

    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Check if user exists in profiles
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (profileError || !profile) return false;
    
    // Only allow capturing password if they've never logged in before (Last Seen is Never)
    if (profile.last_seen) {
        return false;
    }

    try {
        // Find if they already have an Auth account
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

        // Step 2 & 3: Finalize Auth account with the captured password
        if (authError || !authUser.user) {
            // CASE A: User exists in profiles but NO Auth account exists yet
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    name: profile.name,
                    role: profile.role
                }
            });
            if (createError) throw createError;
        } else {
            // CASE B: Auth account exists but this is the first login after migration 
            // We update their password AND confirm their email to avoid blocks
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
                password: password,
                email_confirm: true
            });
            if (updateError) throw updateError;
        }
        
        // Mark as password reset required and update status
        await supabaseAdmin
            .from('profiles')
            .update({ 
                password_reset_required: true,
                status: 'active' // Activate account upon first login
            })
            .eq('id', profile.id);
        return true;
    } catch (err) {
        console.error('Legacy login fallback error:', err);
        return false;
    }
};

export const handleSignOut = async () => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
};

// Placeholder for missing functions that were in the original file
export const getUsers = async (): Promise<User[]> => {
    await ensureAdmin();
    const supabaseAdmin = getSupabaseAdmin();
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                companies (
                    name
                )
            `)
            .range(from, from + step - 1)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching users:', error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    return allData.map(mapProfileToUser);
};

// Helper Mappers
const mapProfileToUser = (profile: any): User => ({
    uid: profile.id,
    name: profile.name,
    email: profile.email,
    tier: profile.tier,
    status: profile.status,
    created_at: new Date(profile.created_at),
    last_seen: profile.last_seen ? new Date(profile.last_seen) : undefined,
    role: profile.role,
    type: profile.type,
    passwordResetRequired: profile.password_reset_required,
    companyId: profile.company_id,
    company: profile.companies?.name || null,
    phone: profile.phone,
    payment_terms: profile.payment_terms,
    remarks: profile.remarks,
    dmc: profile.dmc,
    country: profile.country,
    approvedBy: profile.approved_by,
    approvedAt: profile.approved_at ? new Date(profile.approved_at) : undefined,
    canViewUsers: profile.can_view_users,
    hasAllTierAccess: profile.has_all_tier_access,
});

const mapUserToProfile = (user: Partial<User>): any => {
    const profile: any = {};
    if (user.name !== undefined) profile.name = user.name;
    if (user.email !== undefined) profile.email = user.email;
    if (user.tier !== undefined) profile.tier = user.tier;
    if (user.status !== undefined) profile.status = user.status;
    if (user.role !== undefined) profile.role = user.role;
    if (user.type !== undefined) profile.type = user.type;
    if (user.companyId !== undefined) {
        profile.company_id = (user.companyId === '' || user.companyId === null) ? null : user.companyId;
    }
    if (user.phone !== undefined) profile.phone = user.phone;
    if (user.payment_terms !== undefined) profile.payment_terms = user.payment_terms;
    if (user.remarks !== undefined) profile.remarks = user.remarks;
    if (user.dmc !== undefined) profile.dmc = user.dmc;
    if (user.country !== undefined) profile.country = user.country;
    if (user.passwordResetRequired !== undefined) profile.password_reset_required = user.passwordResetRequired;
    if (user.canViewUsers !== undefined) profile.can_view_users = user.canViewUsers;
    if (user.hasAllTierAccess !== undefined) profile.has_all_tier_access = user.hasAllTierAccess;
    if (user.last_seen !== undefined) profile.last_seen = user.last_seen.toISOString();
    if (user.approvedBy !== undefined) profile.approved_by = user.approvedBy;
    if (user.approvedAt !== undefined) profile.approved_at = user.approvedAt instanceof Date ? user.approvedAt.toISOString() : user.approvedAt;
    if (user.created_at !== undefined) profile.created_at = user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at;
    return profile;
};

// Placeholder for missing functions that were in the original file
export const sendPasswordResetEmail = async (email: string) => {
    try {
        const supabase = await createClient();
        
        // Get the site URL dynamically from headers to ensure redirect works in all environments
        const headersList = await import('next/headers').then(h => h.headers());
        const host = headersList.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const siteUrl = `${protocol}://${host}`;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/auth/callback?next=/reset-password`
        });
        
        if (error) {
            // If rate limit exceeded, try to generate a link manually and send via our email service
            if (error.message.includes('rate limit exceeded') || (error as any).status === 429) {
                console.warn('Supabase email rate limit hit, falling back to manual link generation');
                
                const supabaseAdmin = getSupabaseAdmin();
                const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: email,
                    options: {
                        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`
                    }
                });

                if (linkError) {
                    console.error('Failed to generate recovery link manually:', linkError);
                    throw error; // Throw the original rate limit error if fallback fails
                }

                const link = data.properties.action_link;
                const companyDetails = await getCompanyDetails();
                
                try {
                    await sendEmail({
                        to: { email, name: email.split('@')[0] },
                        from: { 
                            email: companyDetails.contactEmail || 'noreply@example.com', 
                            name: companyDetails.companyName || 'Soroi Agents Portal' 
                        },
                        subject: 'Reset Your Password',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>Reset Your Password</h2>
                                <p>Hello,</p>
                                <p>You requested a password reset for your account on ${companyDetails.companyName}. Click the button below to set a new password:</p>
                                <div style="margin: 30px 0;">
                                    <a href="${link}" style="background-color: #7B6A58; color: white; padding: 12px 24px; text-decoration: none; rounded: 4px; font-weight: bold;">Set New Password</a>
                                </div>
                                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                                <p style="word-break: break-all; color: #666;">${link}</p>
                                <p>If you did not request this, please ignore this email.</p>
                                <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
                                <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} ${companyDetails.companyName}. All rights reserved.</p>
                            </div>
                        `,
                        text: `Hello, You requested a password reset for your account. Use this link to set a new password: ${link}`
                    });
                    return; // Success via fallback
                } catch (emailError) {
                    console.error('Failed to send manual recovery email:', emailError);
                    throw error; // Throw original rate limit error if email sending fails
                }
            }
            throw error;
        }
    } catch (error: any) {
        console.error('Error in sendPasswordResetEmail:', error);
        throw error;
    }
};

export const sendActivationEmail = async (user: User) => {
    const companyDetails = await getCompanyDetails();
    const template = await getEmailTemplateByEvent('user.activated');
    
    if (!template) return { success: false };

    const html = template.body
        .replace(/{{userName}}/g, user.name)
        .replace(/{{companyName}}/g, companyDetails.companyName)
        .replace(/{{userEmail}}/g, user.email);

    const subject = template.subject.replace(/{{companyName}}/g, companyDetails.companyName);

    try {
        // For activation, we primarily use MailerSend because Supabase doesn't have a "Welcome/Activated" template
        // but we can try to use Supabase's invite if they haven't confirmed yet.
        // However, the user's request is to use Supabase as primary.
        // Since there's no direct "Activation" email in Supabase, we'll use MailerSend.
        // If the user meant "Invite", we could use inviteUserByEmail.
        
        await sendEmail({
            to: { email: user.email, name: user.name },
            from: { 
                email: companyDetails.contactEmail || 'noreply@example.com', 
                name: companyDetails.companyName 
            },
            subject,
            html
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send activation email:', error);
        return { success: false };
    }
};

export const sendAdminNewUserEmail = async (newUser: any) => {
    const companyDetails = await getCompanyDetails();
    const template = await getEmailTemplateByEvent('user.signup.admin_notification');
    
    if (!template) return { success: false };

    const html = template.body
        .replace(/{{newUserName}}/g, newUser.name)
        .replace(/{{newUserEmail}}/g, newUser.email)
        .replace(/{{newUserCompany}}/g, newUser.company || 'N/A')
        .replace(/{{companyName}}/g, companyDetails.companyName);

    const subject = template.subject.replace(/{{companyName}}/g, companyDetails.companyName);

    try {
        // Admin notifications always go through MailerSend as Supabase doesn't support them
        await sendEmail({
            to: { email: companyDetails.contactEmail, name: 'Admin' },
            from: { 
                email: 'system@example.com', 
                name: companyDetails.companyName 
            },
            subject,
            html
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send admin notification email:', error);
        return { success: false };
    }
};

export const isAgentProfileComplete = async (uid: string): Promise<boolean> => {
    const user = await getUser(uid);
    if (!user || user.role !== 'Agent') return true;
    return !!(user.name && user.email && user.phone && user.companyId);
};
