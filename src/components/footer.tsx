
"use client";

import { useState, useEffect } from "react";
import type { CompanyDetails } from "@/lib/types";
import { getCompanyDetails } from "@/services/settings-service";

export function Footer() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [companyName, setCompanyName] = useState('Your Company');

    useEffect(() => {
        setYear(new Date().getFullYear());
        
        const fetchDetails = async () => {
            const details = await getCompanyDetails();
            if(details.companyName) {
                setCompanyName(details.companyName);
            }
        };
        fetchDetails();
    }, []);

    return (
        <footer className="shrink-0 border-t bg-card px-8 py-4 text-center text-sm text-muted-foreground">
            <p>&copy; {year} {companyName}. All Rights Reserved.</p>
        </footer>
    );
}
