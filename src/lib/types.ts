
export type Tier = 'Brass' | 'Bronze' | 'Silver' | 'Gold' | 'Preferred' | 'Super Preferred' | 'Platinum' | 'Rack Rates';
export type Category = 'rates' | 'itineraries' | 'brochures' | 'images' | 'deals' | 'park-fees' | 'how-to-get-there' | 'training' | 'factsheet' | 'videos' | 'activity-sheets' | 'spa-menu';
export type Role = 'Admin' | 'Agent' | 'Super Admin';
export type Status = 'active' | 'inactive' | 'pending';
export type UserType = 'local' | 'international';
export type TrainingCategory = 'general' | 'webinar';
export type PropertyType = 'Lodge' | 'Camp' | 'Hotel' | 'Cottage';

export type TierCommissions = Record<Tier, number>;

export type SignedContract = {
  name: string;
  url: string;
  uploaded_at: Date;
}

export type Company = {
  id: string;
  name: string;
  phone?: string;
  website_url?: string;
  company_reg?: string;
  company_reg_doc?: SignedContract;
  tra_license?: string;
  tra_license_doc?: SignedContract;
  street_address?: string;
  city?: string;
  country?: string;
  postal_address?: string;
  zip_code?: string;
  vat_no?: string;
  signed_contracts?: SignedContract[];
  dmc?: string; 
};

export type User = {
  uid: string;
  name: string;
  email: string;
  tier: Tier;
  status: Status;
  created_at: Date;
  last_seen?: Date;
  role: Role;
  type: UserType;
  passwordResetRequired?: boolean;
  companyId?: string; // Link to the companies collection
  company?: string; // Storing name for display purposes
  phone?: string; // User's direct phone, not company's
  payment_terms?: string;
  remarks?: string;
  dmc?: string;
  country?: string;
  approvedBy?: string;
  approvedAt?: Date;
  canViewUsers?: boolean;
  hasAllTierAccess?: boolean;
};

export type Resource = {
  id: string;
  title: string;
  description: string;
  category: Category;
  tier_access: Tier[];
  file_url: string;
  uploaded_at: Date;
  imageUrl?: string; 
};

export type Rate = {
  id: string;
  title: string;
  description: string;
  tier_access: Tier[];
  user_type_access: UserType[];
  fileUrl?: string;
  imageUrl: string;
  uploaded_at: Date;
  isNett?: boolean;
}

export type ExclusiveDeal = {
  id: string;
  title: string;
  description: string;
  tier_access: Tier[];
  user_type_access: UserType[];
  fileUrl: string;
  imageUrl: string;
  uploaded_at: Date;
  valid_until: Date;
  featured?: boolean;
}

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  location: string;
  description: string;
  images: string[];
  total_rooms: number;
  room_types: { name: string; count: number }[];
  facilities: string[];
  amenities: string[];
  activities: string[];
  wetuIbrochureUrl?: string;
  featured?: boolean;
};

export type TravelLink = {
  type: 'url' | 'file';
  value: string;
};

export type ItineraryPackage = {
  name: string;
  driveIn: TravelLink;
  flyIn: TravelLink;
  railSafari: TravelLink;
};

export type PackagedItinerary = {
  id: string;
  title: string;
  commissionInfo: string;
  description: string;
  notes: string;
  packages: ItineraryPackage[];
  tier_access: Tier[];
  user_type_access: UserType[];
  uploaded_at: Date;
  featured?: boolean;
  isNetPackage?: boolean;
};

export type FeeDetail = {
  label: string;
  adult: number;
  child: number;
};

export type ParkFee = {
  id: string;
  location: string;
  fees: FeeDetail[];
  note: string;
  user_type: UserType;
};

export type HowToGetThereLocation = {
  id: string;
  name: string;
  mapUrl: string;
  flights: FlightInfo[];
  trains: TrainInfo[];
  roads: RoadInfo[];
  tier_access: Tier[];
};

export type FlightInfo = {
  departingFrom: string;
  arrivingTo: string;
  location1: string; // Ol Kiombo
  location2: string; // Samburu/Larsens Camp
  location3: string; // Amboseli
  location4: string; // Taita Hills/Lions Bluff
  location5: string; // Ukunda
};

export type TrainInfo = {
  routing: string;
  county: string;
  express: string;
};

export type RoadInfo = {
  routing: string;
  drivingTime: string;
  cost: string;
  net: string;
};

export type TrainingResource = {
  id: string;
  title: string;
  category: TrainingCategory;
  tier_access: Tier[];
  fileUrl?: string;
  externalLink?: string;
  uploaded_at: Date;
};

export type CompanyDetails = {
    companyName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    country?: string;
    loginBgUrl?: string;
    loginBgType?: 'image' | 'color';
    loginBgColor?: string;
    reservationsEmail?: string;
    reservationsPhone?: string;
    salesMarketingEmail?: string;
    salesMarketingPhone?: string;
    n8nChatbotUrl?: string;
    flightRoutesImageUrl?: string;
    subscriptionRenewalDate?: Date;
};

export type NoticeBoardSettings = {
    title?: string;
    message?: string;
    updatedAt?: Date;
};

export type PromotionCardSettings = {
    title?: string;
    description?: string;
    imageUrl?: string;
    link?: string;
    linkType?: 'url' | 'file';
    updatedAt?: Date;
}

export type Payment = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: 'Paid' | 'Failed' | 'Pending';
  userId: string;
  transactionId: string;
};

export type MarkdownTheme = {
  light: {
    body: string;
    headings: string;
    links: string;
    bullets: string;
  };
  dark: {
    body: string;
    headings: string;
    links: string;
    bullets: string;
  };
};

export type PopupBannerSettings = {
    enabled: boolean;
    title: string;
    description: string;
    imageUrl?: string;
    buttonText?: string;
    buttonLink?: string;
    position: 'bottom-left' | 'bottom-right' | 'center-left' | 'center-right';
    visibility: 'everyone' | 'logged-in' | 'logged-out';
    duration: number; // in seconds
    displayFrequency: 'session' | 'day' | 'once' | 'always' | 'every_x_days';
    displayFrequencyDays?: number;
};


// Live Chat Types
export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
  author?: {
    name: string;
    uid: string;
  };
  timestamp?: Date;
};

export type ChatSession = {
  id: string;
  userId: string;
  createdAt: Date;
  lastMessageAt: Date;
  messages: ChatMessage[];
  status: 'open' | 'closed';
  user?: User;
};

// Audit Log Types
export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  details: Record<string, any>;
  status: 'success' | 'failure';
};

// Email Template Types
export type EmailTemplateEvent = 'user.activated' | 'password.reset' | 'user.signup.admin_notification';

export type EmailTemplate = {
  id: EmailTemplateEvent;
  name: string;
  subject: string;
  body: string; // HTML body
  placeholders: string[];
};

export type CreateUserDto = {
  email: string;
  password?: string;
  name?: string;
  company?: string;
  companyId?: string;
  type?: UserType;
  tier?: Tier;
  status?: Status;
  role?: Role;
  passwordResetRequired?: boolean;
  phone?: string;
  country?: string;
  dmc?: string;
  payment_terms?: string;
  remarks?: string;
}
    
