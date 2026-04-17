import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import type { ParkFee } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ParkFeeCardProps {
    feeInfo: ParkFee;
}

export function ParkFeeCard({ feeInfo }: ParkFeeCardProps) {
    const formatCurrency = (amount: number) => {
        return `KES ${amount.toLocaleString('en-US')}`;
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="text-xl text-center">{feeInfo.location}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {feeInfo.fees.map((fee, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Separator />}
                        <div className="space-y-1">
                            <h4 className="font-semibold text-base text-foreground">{fee.label}</h4>
                            <p className="text-muted-foreground">
                                Adult: {formatCurrency(fee.adult)} | Child: {formatCurrency(fee.child)}
                            </p>
                        </div>
                    </React.Fragment>
                ))}
            </CardContent>
            <CardFooter>
                 <p className="text-sm text-muted-foreground italic w-full text-center">{feeInfo.note}</p>
            </CardFooter>
        </Card>
    );
}
