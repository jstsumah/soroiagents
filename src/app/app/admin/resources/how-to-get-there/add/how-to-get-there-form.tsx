
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { uploadFile } from "@/services/storage-service";

const flightSchema = z.object({
  departingFrom: z.string().min(1, "Required"),
  arrivingTo: z.string().min(1, "Required"),
  location1: z.string().min(1, "Required"),
  location2: z.string().min(1, "Required"),
  location3: z.string().min(1, "Required"),
  location4: z.string().min(1, "Required"),
  location5: z.string().min(1, "Required"),
});

const trainSchema = z.object({
  routing: z.string().min(1, "Required"),
  county: z.string().min(1, "Required"),
  express: z.string().min(1, "Required"),
});

const roadSchema = z.object({
  routing: z.string().min(1, "Required"),
  drivingTime: z.string().min(1, "Required"),
  cost: z.string().min(1, "Required"),
  net: z.string().min(1, "Required"),
});

const formSchema = z.object({
  name: z.string().min(3, "Location name is required."),
  mapImage: z.any().optional(),
  tier_access: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one tier.",
  }),
  flights: z.array(flightSchema),
  trains: z.array(trainSchema),
  roads: z.array(roadSchema),
});

export function HowToGetThereForm({ locationData }: { locationData?: HowToGetThereLocation }) {
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!locationData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: locationData ? {
        ...locationData,
        mapImage: undefined,
    } : {
      name: "",
      mapImage: undefined,
      tier_access: [],
      flights: [],
      trains: [],
      roads: [],
    },
  });

  const { fields: flightFields, append: appendFlight, remove: removeFlight } = useFieldArray({ control: form.control, name: "flights" });
  const { fields: trainFields, append: appendTrain, remove: removeTrain } = useFieldArray({ control: form.control, name: "trains" });
  const { fields: roadFields, append: appendRoad, remove: removeRoad } = useFieldArray({ control: form.control, name: "roads" });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  }

  const uploadMapImage = async (file: File, locationName: string): Promise<string> => {
    const base64 = await fileToBase64(file);
    const path = `how-to-get-there/${locationName.replace(/\s+/g, '-')}/map-${file.name}`;
    return await uploadFile(base64, path, file.type);
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
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

        const dataToSave: Omit<HowToGetThereLocation, 'id'> = {
            name: values.name,
            mapUrl: mapUrl!,
            tier_access: values.tier_access,
            flights: values.flights,
            trains: values.trains,
            roads: values.roads,
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

  const SectionCard = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
  
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
                                <div className="relative aspect-video w-full max-w-sm rounded-md border">
                                    <Image src={locationData.mapUrl} alt="Current map" layout="fill" objectFit="cover" className="rounded-md" unoptimized />
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
            {flightFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                     <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Flight Route #{index + 1}</h4>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeFlight(index)}><Trash2 className="mr-2"/> Remove</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`flights.${index}.departingFrom`} render={({ field }) => (<FormItem><FormLabel>Departing From</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.arrivingTo`} render={({ field }) => (<FormItem><FormLabel>Arriving To</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.location1`} render={({ field }) => (<FormItem><FormLabel>Ol Kiombo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.location2`} render={({ field }) => (<FormItem><FormLabel>Samburu/Larsens</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.location3`} render={({ field }) => (<FormItem><FormLabel>Amboseli</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.location4`} render={({ field }) => (<FormItem><FormLabel>Taita Hills</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`flights.${index}.location5`} render={({ field }) => (<FormItem><FormLabel>Ukunda</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendFlight({ departingFrom: '', arrivingTo: '', location1: '', location2: '', location3: '', location4: '', location5: '' })}>
                <PlusCircle className="mr-2"/> Add Flight Route
            </Button>
            </div>
        </SectionCard>

        <SectionCard title="Trains" description="Add train routes for this location.">
            <div className="space-y-4">
                {trainFields.map((field, index) => (
                     <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Train Route #{index + 1}</h4>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeTrain(index)}><Trash2 className="mr-2"/> Remove</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name={`trains.${index}.routing`} render={({ field }) => (<FormItem><FormLabel>Routing</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name={`trains.${index}.county`} render={({ field }) => (<FormItem><FormLabel>County</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name={`trains.${index}.express`} render={({ field }) => (<FormItem><FormLabel>Express</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendTrain({ routing: '', county: '', express: '' })}>
                    <PlusCircle className="mr-2"/> Add Train Route
                </Button>
            </div>
        </SectionCard>

        <SectionCard title="Roads" description="Add road routes for this location.">
             <div className="space-y-4">
                {roadFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Road Route #{index + 1}</h4>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeRoad(index)}><Trash2 className="mr-2"/> Remove</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name={`roads.${index}.routing`} render={({ field }) => (<FormItem><FormLabel>Routing</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`roads.${index}.drivingTime`} render={({ field }) => (<FormItem><FormLabel>Driving Time</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`roads.${index}.cost`} render={({ field }) => (<FormItem><FormLabel>Cost</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`roads.${index}.net`} render={({ field }) => (<FormItem><FormLabel>Net</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => appendRoad({ routing: '', drivingTime: '', cost: '', net: '' })}>
                    <PlusCircle className="mr-2"/> Add Road Route
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
