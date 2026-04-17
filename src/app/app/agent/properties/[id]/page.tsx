

"use server";

import { getProperty } from '@/services/property-service';
import { notFound } from 'next/navigation';
import { PropertyProfileClient, PropertyProfileSkeleton } from '@/app/app/admin/properties/[id]/property-profile-client';
import type { Property } from '@/lib/types';


export default async function PropertyProfilePage({ params }: { params: { id: string } }) {
  const property = await getProperty(params.id);
  
  if (!property) {
    notFound();
  }

  return <PropertyProfileClient property={property} />;
}

    