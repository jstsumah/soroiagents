
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
import type { ParkFee, UserType } from "@/lib/types";
import { addParkFee, updateParkFee } from "@/services/park-fee-service";

const feeDetailSchema = z.object({
  label: z.string().min(3, "Label is required."),
  adult: z.coerce.number().min(0, "Adult fee must be a positive number."),
  child: z.coerce.number().min(0, "Child fee must be a positive number."),
});

const formSchema = z.object({
  location: z.string().min(3, "Location name is required."),
  note: z.string().min(3, "A note is required (e.g., about rates being per person per night)."),
  fees: z.array(feeDetailSchema).min(1, "At least one fee detail is required."),
  user_type: z.enum(['local', 'international']),
});


interface ParkFeeFormProps {
    parkFee?: ParkFee;
    userType?: UserType;
}

export function ParkFeeForm({ parkFee, userType }: ParkFeeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!parkFee;
  const currentFeeType = parkFee?.user_type || userType;
  const currency = currentFeeType === 'local' ? 'KES' : 'USD';


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: parkFee || {
      location: "",
      note: "* Rates charged per person per night",
      fees: [{ label: "", adult: 0, child: 0 }],
      user_type: userType,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fees",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        if (isEditMode && parkFee) {
            await updateParkFee(parkFee.id, values);
            toast({
                title: "Park Fee Updated!",
                description: `The park fee for ${values.location} has been successfully saved.`,
            });
        } else {
            await addParkFee(values);
            toast({
                title: "Park Fee Added!",
                description: `The park fee for ${values.location} has been successfully created.`,
            });
        }
        router.push('/app/admin/resources/park-fees');
        router.refresh();
    } catch (error) {
        console.error("Error saving park fee:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "An error occurred while saving the park fee.",
        });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{parkFee ? "Edit" : "Add"} Park Fee</CardTitle>
        <CardDescription>
          {parkFee ? `Modify the fee details for ${parkFee.location}.` : "Define the details for a new park fee entry."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                 <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Maasai Mara" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., * Rates charged per person per night" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>
            
            <div>
                <FormLabel>Fee Details</FormLabel>
                <FormDescription className="mb-2">Define the different fee types for this location.</FormDescription>
                <div className="space-y-4 rounded-md border p-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[1fr_repeat(2,120px)_auto] gap-4 items-end">
                        <FormField
                            control={form.control}
                            name={`fees.${index}.label`}
                            render={({ field }) => (
                            <FormItem>
                                {index === 0 && <FormLabel className="text-sm">Fee Label</FormLabel>}
                                <FormControl>
                                <Input placeholder="e.g., Residents" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`fees.${index}.adult`}
                            render={({ field }) => (
                                <FormItem>
                                {index === 0 && <FormLabel className="text-sm">Adult ({currency})</FormLabel>}
                                <FormControl>
                                <Input type="number" placeholder="e.g., 5000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`fees.${index}.child`}
                            render={({ field }) => (
                                <FormItem>
                                {index === 0 && <FormLabel className="text-sm">Child ({currency})</FormLabel>}
                                <FormControl>
                                <Input type="number" placeholder="e.g., 2000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 />
                            <span className="sr-only">Remove fee</span>
                        </Button>
                    </div>
                ))}
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => append({ label: "", adult: 0, child: 0 })}
                    >
                    <PlusCircle className="mr-2" />
                    Add Fee Detail
                </Button>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />}
                {parkFee ? "Save Changes" : "Add Park Fee"}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
