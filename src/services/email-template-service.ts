'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { EmailTemplate, EmailTemplateEvent } from '@/lib/types';

const defaultTemplates: Record<EmailTemplateEvent, EmailTemplate> = {
  'user.activated': {
    id: 'user.activated',
    name: 'User Activated',
    subject: 'Welcome to {{companyName}}!',
    body: `<h1>Welcome, {{userName}}!</h1><p>Your account for the {{companyName}} Agent Portal has been activated.</p><p>You can now log in to access exclusive resources, rates, and deals available to you.</p><p>If you have any questions, please don't hesitate to contact us.</p><br/><p>Best regards,</p><p>The {{companyName}} Team</p>`,
    placeholders: ['userName', 'userEmail', 'companyName'],
  },
  'password.reset': {
    id: 'password.reset',
    name: 'Password Reset',
    subject: 'Your Password Reset Link for {{companyName}}',
    body: `<h1>Password Reset Request</h1><p>Hello {{userName}},</p><p>We received a request to reset the password for your account. Click the link below to set a new password:</p><p><a href="{{resetLink}}">Reset Your Password</a></p><p>If you did not request a password reset, please ignore this email.</p><br/><p>Best regards,</p><p>The {{companyName}} Team</p>`,
    placeholders: ['userName', 'userEmail', 'companyName', 'resetLink'],
  },
  'user.signup.admin_notification': {
    id: 'user.signup.admin_notification',
    name: 'Admin: New User Signup',
    subject: 'New User Registration on {{companyName}} Portal',
    body: `<h1>New User Alert</h1><p>A new user has registered on the agent portal and is awaiting approval.</p><ul><li><strong>Name:</strong> {{newUserName}}</li><li><strong>Email:</strong> {{newUserEmail}}</li><li><strong>Company:</strong> {{newUserCompany}}</li></ul><p>Please log in to the admin dashboard to review and activate their account.</p>`,
    placeholders: ['newUserName', 'newUserEmail', 'newUserCompany', 'companyName'],
  },
};

export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('email_templates')
        .select('*');
    
    if (error) {
        console.error('Error fetching email templates:', error);
        return Object.values(defaultTemplates);
    }

    const dbTemplates = new Map((data || []).map(t => [t.id as EmailTemplateEvent, t]));
    
    return Object.values(defaultTemplates).map(defaultTemplate => {
        const dbTemplate = dbTemplates.get(defaultTemplate.id);
        return dbTemplate ? { ...defaultTemplate, ...dbTemplate } : defaultTemplate;
    });
};

export const getEmailTemplateByEvent = async (event: EmailTemplateEvent): Promise<EmailTemplate | null> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', event)
        .maybeSingle();

    const defaultTemplate = defaultTemplates[event];

    if (data) {
        return { ...defaultTemplate, ...data };
    }
    
    return defaultTemplate || null;
};

export const saveEmailTemplate = async (template: Partial<EmailTemplate> & { id: EmailTemplateEvent }): Promise<void> => {
    const { id, ...data } = template;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('email_templates')
        .upsert({ id, ...data });
    
    if (error) throw error;
};
