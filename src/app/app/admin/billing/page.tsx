
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, CheckCircle, Loader2, Calendar, ShieldCheck, ShieldOff } from "lucide-react";
import * as React from 'react';
import { useAuth } from "../../app-provider";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getCompanyDetails, saveCompanyDetails } from "@/services/settings-service";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { PaymentHistoryCard } from "./payment-history-card";
import { extendSubscription } from "@/services/admin-service";

// Placeholder for PayPal icon
const PayPalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16.5 6.4c-1 0-1.8.6-2.2 1.1-.6-.5-1.5-1-2.4-1-1.6 0-2.8 1.1-2.8 2.6 0 1.9 1.4 3 3.3 3h.3c.7 0 1.2-.2 1.4-.4.1.3.1.6.1.9 0 .4-.2.8-.5 1-.4.2-.9.3-1.4.3H8.9c-.5 0-.9.2-1.1.6l-.3 1.1H5l2.4 6.7c.2.6.8 1 1.4 1h1.5c.6 0 1.1-.3 1.3-.8l.9-3.4c.1-.4.4-.6.8-.6h.5c1.8 0 3.3-1.1 3.3-2.9.1-1.8-1.3-3.1-3.2-3.1z"/>
    </svg>
);


export default function BillingPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [renewalDate, setRenewalDate] = React.useState<Date | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRenewing, setIsRenewing] = React.useState(false);
  const [paymentHistoryKey, setPaymentHistoryKey] = React.useState(Date.now());

  const fetchSubscriptionStatus = React.useCallback(async () => {
    setIsLoading(true);
    const details = await getCompanyDetails();
    setRenewalDate(details.subscriptionRenewalDate || null);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading && user && user.role === 'Agent') {
      router.replace('/app/agent/dashboard');
      return;
    }

    if (!isAuthLoading && user && user.role !== 'Super Admin') {
      router.replace('/app/admin/dashboard');
      return;
    }
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user, router, fetchSubscriptionStatus, isAuthLoading]);

  const handleRenewSubscription = async () => {
    setIsRenewing(true);
    try {
        const result = await extendSubscription();

        if (result.success) {
            toast({
                title: "Subscription Renewed!",
                description: "Your Pro Plan has been extended for another year."
            });
            fetchSubscriptionStatus(); // Re-fetch the new status
            setPaymentHistoryKey(Date.now()); // Force re-fetch of payment history
        } else {
            throw new Error((result.data as any).error || 'An unknown error occurred.');
        }
    } catch (e: any) {
        console.error("Renewal error:", e);
        toast({
            variant: "destructive",
            title: "Renewal Failed",
            description: e.message || "An unexpected error occurred. Please try again."
        })
    } finally {
        setIsRenewing(false);
    }
  }
  
  if (isLoading || isAuthLoading || !user || user.role !== 'Super Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSubscribed = renewalDate ? new Date() < renewalDate : false;
  
  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment method.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {!isSubscribed && (
            <div className="w-full lg:max-w-md mx-auto">
                <Card>
                <CardHeader>
                    <CardTitle>PayPal Payment</CardTitle>
                    <CardDescription>
                    Complete your payment securely with PayPal or a debit/credit card.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">Click the button below to proceed. PayPal also supports card payments without requiring an account.</p>
                    <Button size="lg" asChild>
                    <Link href="https://www.paypal.com/ncp/payment/2ZM4J7WK49864" target="_blank" rel="noopener noreferrer">
                        <PayPalIcon className="mr-2 h-5 w-5" />
                        Pay with PayPal
                    </Link>
                    </Button>
                </CardContent>
                </Card>
            </div>
        )}
        <div className={!isSubscribed ? 'lg:col-span-1' : 'lg:col-span-3 lg:flex lg:justify-center'}>
            <div className="w-full lg:max-w-md mx-auto">
                <Card className="border-primary border-2 flex flex-col h-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Pro Plan</CardTitle>
                        <CardDescription as="div">
                            <span className="text-4xl font-bold text-foreground">$30</span>
                            <span className="text-muted-foreground">/month</span>
                            <div className="font-bold text-foreground mt-1">Payable Yearly</div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Unlimited Agents</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Unlimited Resources</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />AI-Powered Chatbot</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Detailed Analytics & Reporting</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Full Brand Customization</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Complete Resource Management</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Advanced Admin Controls</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Priority Support</li>
                        </ul>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full space-y-4 p-4 rounded-lg bg-muted/50 border">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 font-semibold">
                                    {isSubscribed ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <ShieldOff className="h-5 w-5 text-destructive" />}
                                    <span>Subscription Status</span>
                                </div>
                                {isSubscribed ? (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-500/80">Active</Badge>
                                ) : (
                                    <Badge variant="destructive">Expired</Badge>
                                )}
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <span>{isSubscribed ? 'Renews On' : 'Expired On'}</span>
                                </div>
                                <span className="font-mono text-sm">{renewalDate ? renewalDate.toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                        
                        {!isSubscribed && user.role === 'Super Admin' && (
                            <Button className="w-full" size="lg" onClick={handleRenewSubscription} disabled={isRenewing}>
                                {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Renew Subscription
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
      </div>
      <PaymentHistoryCard key={paymentHistoryKey} />
    </div>
  );
}
