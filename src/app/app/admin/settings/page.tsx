

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrandThemeForm } from './brand-theme-form';
import { Separator } from '@/components/ui/separator';
import { CompanyDetailsForm } from './company-details-form';
import { TierColorsForm } from './tier-colors-form';
import { LoginBackgroundForm } from './login-background-form';
import { NoticeBoardForm } from './notice-board-form';
import { N8nChatbotForm } from './n8n-chatbot-form';
import { TierCommissionForm } from './tier-commission-form';
import { FlightRoutesImageForm } from './flight-routes-image-form';
import { PromotionCardForm } from './promotion-card-form';
import { MarkdownThemeForm } from './markdown-theme-form';
import { PopupBannerForm } from './popup-banner-form';
import * as React from 'react';
import { useAuth } from '../../app-provider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EmailTemplates } from './email-templates';

export default function AdminSettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role === 'Agent') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application&apos;s settings.
        </p>
      </div>
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Theme &amp; Branding</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <h4 className="text-lg font-medium mb-2">Login Page Background</h4>
              <p className='text-muted-foreground mb-4'>Set a custom background image or color for the main login screen.</p>
              <LoginBackgroundForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Customize Brand Theme</h4>
              <p className='text-muted-foreground mb-4'>Define the colors for your custom brand theme.</p>
              <BrandThemeForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Tier Colors</h4>
              <p className='text-muted-foreground mb-4'>Define the colors for each agent access tier.</p>
              <TierColorsForm />
            </div>
             <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Markdown Text Colors</h4>
              <p className='text-muted-foreground mb-4'>Define the text colors for markdown content across the app.</p>
              <MarkdownThemeForm />
            </div>
          </CardContent>
        </Card>
      </div>
       <div className="mb-8">
        <Card>
          <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                  Customize the automated emails sent by the system.
              </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
             <EmailTemplates />
          </CardContent>
        </Card>
      </div>
      <div className="mb-8">
        <Card>
          <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>
                  Manage financial configurations like tier commissions.
              </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
              <h4 className="text-lg font-medium mb-2">Tier Commission Levels</h4>
              <p className='text-muted-foreground mb-4'>Set the commission percentage for each agent tier.</p>
              <TierCommissionForm />
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Manage system-wide settings and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <h4 className="text-lg font-medium mb-2">Company Details</h4>
              <p className='text-muted-foreground mb-4'>This information is used for app branding and contact pages.</p>
              <CompanyDetailsForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Dashboard Notice Board</h4>
              <p className='text-muted-foreground mb-4'>Post a message that will be visible on all user dashboards.</p>
              <NoticeBoardForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Dashboard Promotion Card</h4>
              <p className='text-muted-foreground mb-4'>Configure the promotional card on the dashboards.</p>
              <PromotionCardForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Popup Banner</h4>
              <p className='text-muted-foreground mb-4'>Configure a site-wide popup banner for announcements.</p>
              <PopupBannerForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">n8n Automation Chatbot</h4>
              <p className='text-muted-foreground mb-4'>Enter the webhook URL for your n8n chatbot to override the default chat functionality.</p>
              <N8nChatbotForm />
            </div>
            <Separator />
            <div>
              <h4 className="text-lg font-medium mb-2">Flight Routes Image</h4>
              <p className='text-muted-foreground mb-4'>Upload a default image to be displayed on the &quot;How To Get There&quot; page.</p>
              <FlightRoutesImageForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
