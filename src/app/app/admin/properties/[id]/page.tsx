
"use server";

import { getProperty } from '@/services/property-service';
import { notFound } from 'next/navigation';
import { PropertyProfileClient } from './property-profile-client';

// This is now a server component to fetch data initially
export default async function ViewPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  return <PropertyProfileClient property={property} />;
}
