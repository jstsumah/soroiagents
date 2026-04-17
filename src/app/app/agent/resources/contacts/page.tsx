
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCompanyDetails } from "@/services/settings-service";
import type { CompanyDetails } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Mail, Phone, Users, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AgentContactsPage() {
    const [details, setDetails] = useState<CompanyDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getCompanyDetails().then(data => {
            setDetails(data);
            setIsLoading(false);
        });
    }, []);

    const DetailItem = ({ icon, label, value, href }: { icon: React.ReactNode, label: string, value?: string, href?: string }) => {
        if (!value) return null;
        const content = href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a> : <span>{value}</span>;
        return (
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 text-muted-foreground mt-1">{icon}</div>
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                    <p className="text-lg text-foreground font-medium">{content}</p>
                </div>
            </div>
        );
    };

    const DepartmentCard = ({ icon, title, email, phone }: { icon: React.ReactNode, title: string, email?: string, phone?: string }) => {
        if (!email && !phone) return null;
        
        return (
            <Card className="flex-1 min-w-[280px]">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                    <div className="p-3 rounded-md bg-primary text-primary-foreground">
                        {icon}
                    </div>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <DetailItem icon={<Mail className="h-5 w-5"/>} label="Email" value={email} href={`mailto:${email}`} />
                    <DetailItem icon={<Phone className="h-5 w-5"/>} label="Phone" value={phone} href={`tel:${phone}`} />
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                 <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48 mb-2" />
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <div className="flex gap-8">
                             <Skeleton className="h-32 w-full" />
                             <Skeleton className="h-32 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
                <p className="text-muted-foreground">
                    We&apos;re here to help. Reach out to us through any of the channels below.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Building className="h-8 w-8 text-primary" />
                        <CardTitle className="text-2xl">{details?.companyName || 'Our Company'}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <DetailItem icon={<Building />} label="Company Address" value={details?.address && details?.city && details?.country ? `${details.address}, ${details.city}, ${details.country}` : ''} />
                    <DetailItem icon={<Mail />} label="General Email" value={details?.contactEmail} href={`mailto:${details?.contactEmail}`} />
                    <DetailItem icon={<Phone />} label="General Phone" value={details?.contactPhone} href={`tel:${details?.contactPhone}`} />
                    
                    {(details?.reservationsEmail || details?.reservationsPhone || details?.salesMarketingEmail || details?.salesMarketingPhone) && <Separator />}
                    
                     <div className="space-y-2">
                        {(details?.reservationsEmail || details?.reservationsPhone || details?.salesMarketingEmail || details?.salesMarketingPhone) && <h3 className="text-xl font-semibold tracking-tight">Department Contacts</h3>}
                        <div className="flex flex-wrap gap-6">
                            <DepartmentCard 
                                icon={<Users className="h-6 w-6"/>}
                                title="Reservations"
                                email={details?.reservationsEmail}
                                phone={details?.reservationsPhone}
                            />
                             <DepartmentCard 
                                icon={<Briefcase className="h-6 w-6"/>}
                                title="Sales &amp; Marketing"
                                email={details?.salesMarketingEmail}
                                phone={details?.salesMarketingPhone}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
