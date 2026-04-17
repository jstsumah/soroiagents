'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CompanyDetails, Tier, NoticeBoardSettings, TierCommissions, PromotionCardSettings, MarkdownTheme, PopupBannerSettings } from '@/lib/types';
import { TIERS } from '@/lib/constants';
import { getAuthenticatedUser } from './auth-service';
import { logActivity } from './audit-log-service';
import { deleteFile } from './storage-service';

const logSettingsChange = async (action: string, details: Record<string, any>) => {
    try {
        const user = await getAuthenticatedUser();
        if (user) {
            await logActivity({
                userId: user.uid,
                userName: user.name,
                action: `settings.${action}`,
                details
            });
        }
    } catch(e) {
        console.error(`Audit log failed for settings change (${action}):`, e);
    }
}

const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', key)
            .maybeSingle();
        
        if (error || !data || data.value === null) return defaultValue;
        return data.value as T;
    } catch (err) {
        console.error(`Error in getSetting for key ${key}:`, err);
        return defaultValue;
    }
};

const saveSetting = async (key: string, value: any): Promise<void> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
    
    if (error) throw error;
};

// --- Company Details ---
export const getCompanyDetails = async (): Promise<CompanyDetails> => {
    const defaults: CompanyDetails = {
        companyName: 'Tiered Access Hub',
        contactEmail: 'support@example.com',
        contactPhone: '+1 234 567 890',
        address: '123 Main St',
        city: 'Anytown',
        country: 'USA',
        loginBgUrl: '',
        loginBgType: 'image',
        loginBgColor: '#FFFFFF',
        reservationsEmail: 'reservations@example.com',
        reservationsPhone: '+1 234 567 891',
        salesMarketingEmail: 'sales@example.com',
        salesMarketingPhone: '+1 234 567 892',
        n8nChatbotUrl: '',
        flightRoutesImageUrl: '',
        subscriptionRenewalDate: new Date(),
    };

    try {
        const data = await getSetting('companyDetails', defaults);
        const result = { ...defaults, ...data };
        if (result.subscriptionRenewalDate) {
            result.subscriptionRenewalDate = new Date(result.subscriptionRenewalDate);
        }
        return result;
    } catch (error) {
        console.error("Error in getCompanyDetails:", error);
        return defaults;
    }
};

export const saveCompanyDetails = async (details: Partial<CompanyDetails>): Promise<void> => {
    const current = await getCompanyDetails();
    
    // Delete old files if replaced
    if (details.loginBgUrl && current.loginBgUrl && details.loginBgUrl !== current.loginBgUrl) {
        await deleteFile(current.loginBgUrl);
    }
    if (details.flightRoutesImageUrl && current.flightRoutesImageUrl && details.flightRoutesImageUrl !== current.flightRoutesImageUrl) {
        await deleteFile(current.flightRoutesImageUrl);
    }

    await saveSetting('companyDetails', { ...current, ...details });
    await logSettingsChange('companyDetails.update', { updatedFields: Object.keys(details) });
};

// --- Tier Colors ---
export type TierColors = Record<Tier, string>;

const defaultTierColors: TierColors = {
  Brass: "#b08d57",
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#f59e0b",
  Preferred: "#7e22ce",
  "Super Preferred": "#e11d48",
  Platinum: "#e5e4e2",
  "Rack Rates": "#888888",
};

export const getTierColors = async (): Promise<TierColors> => {
    try {
        const colors = await getSetting('tierColors', defaultTierColors);
        return { ...defaultTierColors, ...colors };
    } catch (error) {
        console.error("Error in getTierColors:", error);
        return defaultTierColors;
    }
};

export const saveTierColors = async (colors: TierColors): Promise<void> => {
    await saveSetting('tierColors', colors);
    await logSettingsChange('tierColors.update', { message: 'Tier colors updated' });
};

// --- Tier Commissions ---
const defaultTierCommissions: TierCommissions = {
  Brass: 10,
  Bronze: 12,
  Silver: 15,
  Gold: 18,
  Preferred: 20,
  "Super Preferred": 25,
  Platinum: 40,
  "Rack Rates": 0,
};

export const getTierCommissions = async (): Promise<TierCommissions> => {
    try {
        const saved = await getSetting('tierCommissions', defaultTierCommissions);
        const commissions = TIERS.reduce((acc, tier) => {
            acc[tier] = saved[tier] ?? defaultTierCommissions[tier];
            return acc;
        }, {} as TierCommissions);
        return commissions;
    } catch (error) {
        console.error("Error in getTierCommissions:", error);
        return defaultTierCommissions;
    }
};

export const saveTierCommissions = async (commissions: TierCommissions): Promise<void> => {
    await saveSetting('tierCommissions', commissions);
    await logSettingsChange('tierCommissions.update', { message: 'Tier commissions updated' });
};

// --- Brand Theme ---
export type BrandTheme = {
  primary: string;
  background: string;
  accent: string;
};

const defaultBrandTheme: BrandTheme = {
  primary: "#7B6A58",
  background: "#E9E8E7",
  accent: "#B68D6A",
};

export const getBrandTheme = async (): Promise<BrandTheme> => {
    try {
        const theme = await getSetting('brandTheme', defaultBrandTheme);
        return { ...defaultBrandTheme, ...theme };
    } catch (error) {
        console.error("Error in getBrandTheme:", error);
        return defaultBrandTheme;
    }
};

export const saveBrandTheme = async (theme: BrandTheme): Promise<void> => {
    await saveSetting('brandTheme', theme);
    await logSettingsChange('brandTheme.update', { message: 'Brand theme updated' });
};

// --- Notice Board Settings ---
export const getNoticeBoardSettings = async (): Promise<NoticeBoardSettings> => {
    const defaults: NoticeBoardSettings = { 
        title: 'Welcome Aboard!', 
        message: 'Welcome to our team. We’re excited to have you with us. Your passion for adventure and travel will enhance our journey together. If you need anything or have questions, please don\'t hesitate to reach out. Here’s to unforgettable experiences ahead! Welcome aboard!', 
        updatedAt: new Date() 
    };
    try {
        const data = await getSetting('noticeBoard', defaults);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
        return { ...defaults, ...data };
    } catch (error) {
        console.error("Error in getNoticeBoardSettings:", error);
        return defaults;
    }
};

export const saveNoticeBoardSettings = async (settings: Partial<NoticeBoardSettings>): Promise<void> => {
    const current = await getNoticeBoardSettings();
    await saveSetting('noticeBoard', { ...current, ...settings, updatedAt: new Date().toISOString() });
    await logSettingsChange('noticeBoard.update', { title: settings.title });
};

// --- Promotion Card Settings ---
export const getPromotionCardSettings = async (): Promise<PromotionCardSettings> => {
    const defaults: PromotionCardSettings = { 
        title: 'Featured Promotion', 
        description: 'Check out our latest special offer, available for a limited time.', 
        link: '#',
        imageUrl: '',
        updatedAt: new Date() 
    };
    try {
        const data = await getSetting('promotionCard', defaults);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
        return { ...defaults, ...data };
    } catch (error) {
        console.error("Error in getPromotionCardSettings:", error);
        return defaults;
    }
};

export const savePromotionCardSettings = async (settings: Partial<PromotionCardSettings>): Promise<void> => {
    const current = await getPromotionCardSettings();

    // Delete old image if replaced
    if (settings.imageUrl && current.imageUrl && settings.imageUrl !== current.imageUrl) {
        await deleteFile(current.imageUrl);
    }

    await saveSetting('promotionCard', { ...current, ...settings, updatedAt: new Date().toISOString() });
    await logSettingsChange('promotionCard.update', { title: settings.title });
};

// --- Markdown Theme Settings ---
const defaultMarkdownTheme: MarkdownTheme = {
    light: {
        body: "#333333",
        headings: "#111111",
        links: "#0066cc",
        bullets: "#666666",
    },
    dark: {
        body: "#cccccc",
        headings: "#ffffff",
        links: "#8ab4f8",
        bullets: "#999999",
    }
};

export const getMarkdownTheme = async (): Promise<MarkdownTheme> => {
    try {
        const data = await getSetting('markdownTheme', defaultMarkdownTheme);
        if (!data) return defaultMarkdownTheme;
        return {
            light: { ...defaultMarkdownTheme.light, ...(data.light || {}) },
            dark: { ...defaultMarkdownTheme.dark, ...(data.dark || {}) }
        };
    } catch (error) {
        console.error("Error in getMarkdownTheme:", error);
        return defaultMarkdownTheme;
    }
};

export const saveMarkdownTheme = async (theme: MarkdownTheme): Promise<void> => {
    await saveSetting('markdownTheme', theme);
    await logSettingsChange('markdownTheme.update', {});
};

// --- Popup Banner Settings ---
const defaultPopupBannerSettings: PopupBannerSettings = {
    enabled: false,
    title: 'Special Announcement',
    description: 'Check out our latest news and offers!',
    imageUrl: '',
    buttonText: 'Learn More',
    buttonLink: '#',
    position: 'bottom-right',
    visibility: 'everyone',
    duration: 15,
    displayFrequency: 'session',
    displayFrequencyDays: 7,
};

export const getPopupBannerSettings = async (): Promise<PopupBannerSettings> => {
    try {
        const data = await getSetting('popupBanner', defaultPopupBannerSettings);
        return { ...defaultPopupBannerSettings, ...data };
    } catch (error) {
        console.error("Error in getPopupBannerSettings:", error);
        return defaultPopupBannerSettings;
    }
};

export const savePopupBannerSettings = async (settings: Partial<PopupBannerSettings>): Promise<void> => {
    const current = await getPopupBannerSettings();

    // Delete old image if replaced
    if (settings.imageUrl && current.imageUrl && settings.imageUrl !== current.imageUrl) {
        await deleteFile(current.imageUrl);
    }

    await saveSetting('popupBanner', { ...current, ...settings });
    await logSettingsChange('popupBanner.update', { title: settings.title, enabled: settings.enabled });
};

export const getAvailabilityChartSettings = async (): Promise<{ embedCode?: string }> => {
    return await getSetting('availabilityChart', {});
};

export const saveAvailabilityChartSettings = async (settings: { embedCode: string }): Promise<void> => {
    await saveSetting('availabilityChart', settings);
    await logSettingsChange('availabilityChart.update', {});
};
