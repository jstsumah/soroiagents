
import { ParkFeeForm } from "../add/park-fee-form";

export default function AddNonResidentParkFeePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Non-Resident Park Fee</h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new non-resident park fee entry in USD.
        </p>
      </div>
      <ParkFeeForm />
    </div>
  );
}
