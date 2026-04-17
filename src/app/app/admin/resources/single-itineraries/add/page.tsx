
"use client";

import { ResourceUploadForm } from "../../resource-upload-form";

export default function AddSingleItineraryPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Single Itinerary</h1>
        <p className="text-muted-foreground">
          Fill out the form below to upload a new single itinerary for your agents.
        </p>
      </div>
      <ResourceUploadForm />
    </div>
  );
}
