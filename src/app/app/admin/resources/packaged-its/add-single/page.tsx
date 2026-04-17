
"use client";

import { ResourceUploadForm } from "../../resource-upload-form";

export default function AddSingleItineraryPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Itinerary File</h1>
        <p className="text-muted-foreground">
          Upload a file (like a PDF or image) for an itinerary. This will appear alongside packaged itineraries.
        </p>
      </div>
      <ResourceUploadForm isItinerary={true} />
    </div>
  );
}

