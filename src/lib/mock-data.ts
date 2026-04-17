
import type { User, Rate, ExclusiveDeal, Property, PackagedItinerary, ParkFee, HowToGetThereLocation, TrainingResource, CompanyDetails } from './types';

// This file contains mock data to prevent build errors.
// In a real application, this data should be fetched from a database.

export const mockUsers: User[] = [
  {
    uid: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    tier: 'Gold',
    status: 'active',
    created_at: new Date('2023-01-15'),
    role: 'Agent',
    company: 'Safari Ventures',
    dmc: 'Kenya Tours',
    type: 'international',
  },
   {
    uid: '6',
    name: 'Admin User',
    email: 'admin@example.com',
    tier: 'Super Preferred',
    status: 'active',
    created_at: new Date('2023-01-10'),
    role: 'Admin',
    company: 'Tiered Access Hub',
    dmc: 'N/A',
    type: 'local',
  },
];

export const mockRates: Rate[] = [];
export const mockProperties: Property[] = [];
export const mockPackagedItineraries: PackagedItinerary[] = [];

export const mockParkFees: ParkFee[] = [
    {
        id: '1',
        location: 'Maasai Mara',
        fees: [
            { label: 'Residents', adult: 1200, child: 500 },
            { label: 'Citizens', adult: 1000, child: 300 }
        ],
        note: '* Rates charged per person per night',
        user_type: 'local',
    },
];

export const mockParkFeesNonResident: ParkFee[] = [
     {
        id: '2',
        location: 'Maasai Mara',
        fees: [
            { label: 'Non-Residents', adult: 80, child: 40 }
        ],
        note: '* Rates charged per person per night in USD',
        user_type: 'international',
    },
];


export const mockHowToGetThereData: HowToGetThereLocation[] = [
    {
        id: '1',
        name: 'Maasai Mara',
        mapUrl: 'https://placehold.co/1200x600.png?text=Maasai+Mara+Map',
        tier_access: ['Bronze', 'Silver', 'Gold', 'Preferred', 'Super Preferred'],
        flights: [],
        trains: [],
        roads: []
    }
];

export const mockTrainingResources: TrainingResource[] = [
    {
        id: '1',
        title: 'Magical Kenya Travel Specialist Program',
        category: 'general',
        tier_access: ['Bronze'],
        fileUrl: '#',
        uploaded_at: new Date(),
    }
];

export const mockCompanyDetails: CompanyDetails = {
  companyName: 'Tiered Access Hub',
  contactEmail: 'support@example.com',
  contactPhone: '+1 234 567 890',
  address: '123 Main St',
  city: 'Anytown',
  country: 'USA'
};
