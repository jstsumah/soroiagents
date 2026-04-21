"use client";

import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { HowToGetThereLocation } from "@/lib/types";
import { TIERS } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { addLocation, updateLocation } from "@/services/how-to-get-there-service";
import * as React from 'react';
import Image from "next/image";
import { uploadFileFromFormData } from "@/services/storage-service";

interface FlightRoute {
  departingFrom: string;
  arrivingTo: string;
  location1: string;
  location2: string;
  location3: string;
  location4: string;
  location5: string;
}

interface TrainRoute {
  routing: string;
  county: string;
  express: string;
}

interface RoadRoute {
  routing: string;
  drivingTime: string;
  cost: string;
  net: string;
}

interface FormData {
  name: string;
  mapImage?: FileList;
  tier_access: string[];
  flights: FlightRoute[];
  trains: TrainRoute[];
  roads: RoadRoute[];
}

// Simple schema without nested objects - validation done manually
const formSchema = z.object({
  name: z.string().min(3, "Location name is required."),
  mapImage: z.any().optional(),
  tier_access: z.array(z.string()).max(10),
  flights: z.array(z.any()),
  trains: z.array(z.any()),
  roads: z.array(z.any()),
});

const SectionCard = React.memo(({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
  <Card className="bg-muted/30">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
));
SectionCard.displayName = 'SectionCard';

const FlightRouteRow = React.memo(function FlightRouteRow({ control, index, onRemove }: {
  control: any;
  index: number;
  onRemove: () => void;
}) {
  const base = `flights.${index}` as const;
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Flight Route #{index + 1}</h4>
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4"/> Remove
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={control} name={`${base}.departingFrom`} render={({ field }) => (
          <FormItem>
            <FormLabel>Departing From</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.arrivingTo`} render={({ field }) => (
          <FormItem>
            <FormLabel>Arriving To</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.location1`} render={({ field }) => (
          <FormItem>
            <FormLabel>Ol Kiombo</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.location2`} render={({ field }) => (
          <FormItem>
            <FormLabel>Samburu/Larsens</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.location3`} render={({ field }) => (
          <FormItem>
            <FormLabel>Amboseli</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.location4`} render={({ field }) => (
          <FormItem>
            <FormLabel>Taita Hills</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.location5`} render={({ field }) => (
          <FormItem>
            <FormLabel>Ukunda</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
});

const TrainRouteRow = React.memo(function TrainRouteRow({ control, index, onRemove }: {
  control: any;
  index: number;
  onRemove: () => void;
}) {
  const base = `trains.${index}` as const;
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Train Route #{index + 1}</h4>
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4"/> Remove
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField control={control} name={`${base}.routing`} render={({ field }) => (
          <FormItem>
            <FormLabel>Routing</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.county`} render={({ field }) => (
          <FormItem>
            <FormLabel>County</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.express`} render={({ field }) => (
          <FormItem>
            <FormLabel>Express</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
});

const RoadRouteRow = React.memo(function RoadRouteRow({ control, index, onRemove }: {
  control: any;
  index: number;
  onRemove: () => void;
}) {
  const base = `roads.${index}` as const;
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Road Route #{index + 1}</h4>
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4"/> Remove
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormField control={control} name={`${base}.routing`} render={({ field }) => (
          <FormItem>
            <FormLabel>Routing</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.drivingTime`} render={({ field }) => (
          <FormItem>
            <FormLabel>Driving Time</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.cost`} render={({ field }) => (
          <FormItem>
            <FormLabel>Cost</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${base}.net`} render={({ field }) => (
          <FormItem>
            <FormLabel>Net</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
});

export function HowToGetThereForm({ locationData }: { locationData?: HowToGetThereLocation }) {
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!locationData;

  const form = useForm<FormData>({
    defaultValues: React.useMemo(() => locationData ? {
        name: locationData.name,
        mapImage: undefined,
        tier_access: locationData.tier_access || [],
        flights: locationData.flights || [],
        trains: locationData.trains || [],
        roads: locationData.roads || [],
    } : {
      name: "",
      mapImage: undefined,
      tier_access: [],
      flights: [],
      trains: [],
      roads: [],
    }, [locationData]),
  });

  const flightArray = useFieldArray({ control: form.control, name: "flights" });
  const trainArray = useFieldArray({ control: form.control, name: "trains" });
  const roadArray = useFieldArray({ control: form.control, name: "roads" });

  // fileToBase64 removed — using FormData upload to avoid Next.js payload limits

  const uploadMapImage = async (file: File, locationName: string): Promise<string> => {
    // Use FormData to avoid base64 payload size limits in Next.js server actions
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', `how-to-get-there/${locationName.replace(/\s+/g, '-')}/map-${file.name}`);
    return await uploadFileFromFormData(formData);
  };

  // Manual validation to avoid zod nested object serialization
  function validateForm(values: FormData): boolean {
    if (!values.name || values.name.length < 3) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Location name must be at least 3 characters.' });
      return false;
    }
    if (!values.tier_access || values.tier_access.length === 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Select at least one tier.' });
      return false;
    }
    // Validate flights
    for (let i = 0; i < values.flights.length; i++) {
      const f = values.flights[i];
      if (!f.departingFrom || !f.arrivingTo || !f.location1 || !f.location2 || !f.location3 || !f.location4 || !f.location5) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `Flight route ${i + 1} has empty fields.` });
        return false;
      }
    }
    // Validate trains
    for (let i = 0; i < values.trains.length; i++) {
      const t = values.trains[i];
      if (!t.routing || !t.county || !t.express) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `Train route ${i + 1} has empty fields.` });
        return false;
      }
    }
    // Validate roads
    for (let i = 0; i < values.roads.length; i++) {
      const r = values.roads[i];
      if (!r.routing || !r.drivingTime || !r.cost || !r.net) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `Road route ${i + 1} has empty fields.` });
        return false;
      }
    }
    return true;
  }

  async function onSubmit(values: FormData) {
    if (!validateForm(values)) return;

    try {
        let mapUrl = locationData?.mapUrl;

        if (values.mapImage && values.mapImage.length > 0) {
            const imageFile = values.mapImage[0] as File;
            mapUrl = await uploadMapImage(imageFile, values.name);
        } else if (!isEditMode) {
            toast({
                variant: 'destructive',
                title: 'Map Image Required',
                description: 'Please upload a map image for the new location.'
            });
            return;
        }

        // Create clean data objects to avoid serialization issues
        const dataToSave: Omit<HowToGetThereLocation, 'id'> = {
            name: values.name,
            mapUrl: mapUrl!,
            tier_access: values.tier_access,
            flights: values.flights.map(f => ({
                departingFrom: f.departingFrom,
                arrivingTo: f.arrivingTo,
                location1: f.location1,
                location2: f.location2,
                location3: f.location3,
                location4: f.location4,
                location5: f.location5,
            })),
            trains: values.trains.map(t => ({
                routing: t.routing,
                county: t.county,
                express: t.express,
            })),
            roads: values.roads.map(r => ({
                routing: r.routing,
                drivingTime: r.drivingTime,
                cost: r.cost,
                net: r.net,
            })),
        };

        if (isEditMode && locationData) {
            await updateLocation(locationData.id, dataToSave);
            toast({
                title: "Location Updated!",
                description: `The location "${values.name}" has been successfully saved.`,
            });
        } else {
            await addLocation(dataToSave);
            toast({
                title: "Location Added!",
                description: `The location "${values.name}" has been successfully created.`,
            });
        }
        router.push('/app/admin/resources/how-to-get-there');
        router.refresh();
    } catch (error) {
        console.error("Error saving location:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "An unexpected error occurred. Please try again.",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Location Details</CardTitle>
                <CardDescription>
                {locationData ? `Editing details for ${locationData.name}` : "Add a new location and its travel information."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Location Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Maasai Mara" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField
                    control={form.control}
                    name="mapImage"
                    render={({ field: { onChange, onBlur, name, ref } }) => (
                        <FormItem>
                            <FormLabel>Map Image</FormLabel>
                            {isEditMode && locationData?.mapUrl && (
                                <div className="relative aspect-video w-full max-w-sm rounded-md border overflow-hidden">
                                    <Image src={locationData.mapUrl} alt="Current map" fill className="object-cover rounded-md" unoptimized />
                                </div>
                            )}
                            <FormControl>
                                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} onBlur={onBlur} name={name} ref={ref}/>
                            </FormControl>
                             <FormDescription>
                                {isEditMode ? "Upload a new image to replace the current one." : "Upload an image for the location map."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField control={form.control} name="tier_access" render={({ field }) => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Tier Access</FormLabel>
                            <FormDescription>Select which agent tiers can access this information.</FormDescription>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {TIERS.map((item) => (
                                <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                            return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item))
                                        }} />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
            </CardContent>
        </Card>

        <SectionCard title="Flights" description="Add flight routes for this location.">
            <div className="space-y-4">
            {flightArray.fields.map((field, index) => (
                <FlightRouteRow
                  key={field.id}
                  control={form.control}
                  index={index}
                  onRemove={() => flightArray.remove(index)}
                />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => flightArray.append({ departingFrom: '', arrivingTo: '', location1: '', location2: '', location3: '', location4: '', location5: '' })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Flight Route
            </Button>
            </div>
        </SectionCard>

        <SectionCard title="Trains" description="Add train routes for this location.">
            <div className="space-y-4">
                {trainArray.fields.map((field, index) => (
                    <TrainRouteRow
                      key={field.id}
                      control={form.control}
                      index={index}
                      onRemove={() => trainArray.remove(index)}
                    />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => trainArray.append({ routing: '', county: '', express: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Train Route
                </Button>
            </div>
        </SectionCard>

        <SectionCard title="Roads" description="Add road routes for this location.">
             <div className="space-y-4">
                {roadArray.fields.map((field, index) => (
                    <RoadRouteRow
                      key={field.id}
                      control={form.control}
                      index={index}
                      onRemove={() => roadArray.remove(index)}
                    />
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => roadArray.append({ routing: '', drivingTime: '', cost: '', net: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Road Route
                </Button>
            </div>
        </SectionCard>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {locationData ? "Save Changes" : "Add Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
