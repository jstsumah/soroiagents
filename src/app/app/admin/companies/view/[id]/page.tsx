
"use server";

import { getCompany } from "@/services/company-service";
import { notFound } from "next/navigation";
import { CompanyProfileClient } from "./company-profile-client";

export default async function ViewCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    notFound();
  }

  return <CompanyProfileClient company={company} />;
}
