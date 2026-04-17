
'use server';

interface EmailRecipient {
    email: string;
    name: string;
}

interface SendEmailParams {
    to: EmailRecipient;
    from: EmailRecipient;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
    const { MailerSend, EmailParams, Sender, Recipient } = await import("mailersend");
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY || '',
    });

    if (!process.env.MAILERSEND_API_KEY) {
        console.error('MAILERSEND_API_KEY is not set. Cannot send email.');
        throw new Error('Email service is not configured.');
    }

    const sentFrom = new Sender(params.from.email, params.from.name);
    const recipients = [
        new Recipient(params.to.email, params.to.name)
    ];

    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(params.subject)
        .setHtml(params.html)
        .setText(params.text || 'This is the text content');

    try {
        await mailerSend.email.send(emailParams);
        console.log(`Email sent successfully to ${params.to.email}`);
    } catch (error: any) {
        const isQuotaError = error?.body?.message?.includes('daily quota limit') || 
                            error?.message?.includes('daily quota limit') ||
                            error?.body?.message?.includes('#MS42901');

        if (isQuotaError) {
            console.error('MailerSend API Quota Exceeded (#MS42901). Email not sent, but continuing process.');
            return; // Don't throw for quota errors to avoid breaking the main flow
        }

        console.error('Error sending email via MailerSend:', error.message);
        
        let errorMessage = 'Failed to send email.';
        if (error?.body?.message) {
            errorMessage = `Failed to send email: ${error.body.message}`;
            console.error('MailerSend API Error Body:', error.body);
        } else if (error instanceof Error) {
             errorMessage = `Failed to send email. Details: ${error.message}`;
        }
        
        throw new Error(errorMessage);
    }
}
