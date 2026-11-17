export type PersonProfile = {
  id: number;
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  enabled: boolean;
  avatar: string | null;
  driver: {
    id: number;
    licenseNumber: string;
    status: string;
    activeDeliveries: number;
    completedDeliveries: number;
    vehicle: { brand: string; model: string; plateNumber: string; type: string } | null;
  } | null;
  deliveryCount: number;
  deliveries: {
    id: number;
    status: string;
    createdAt: string;
    pickupCity: string;
    dropoffCity: string;
  }[];
};
