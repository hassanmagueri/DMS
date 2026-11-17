export type User = {
  id: number;
  username: string;
  email: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  enabled: boolean;
  avatar: string | null;
};

export type Address = {
  id: number;
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
};

export type Delivery = {
  id: number;
  weight: number;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  driver: {
    id: number;
    userId: number;
    status: string;
    licenseNumber: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    location: { latitude: number; longitude: number; updatedAt: string } | null;
  } | null;
  pickup: Address;
  dropoff: Address;
  proof: {
    code: string | null;
    confirmedAt: string | null;
    confirmedBy: string | null;
  };
  payment: {
    id: number;
    amount: string;
    currency: string;
    status: string;
  } | null;
  failureReason: string | null;
  rating: { score: number; createdAt: string } | null;
  timeline: {
    id: number;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: string | null;
  }[];
};

export type Driver = {
  id: number;
  licenseNumber: string;
  status: string;
  activeDeliveries: number;
  completedDeliveries: number;
  ratingAverage: number | null;
  ratingCount: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    username: string;
    enabled: boolean;
  };
  vehicle: {
    id: number;
    brand: string;
    model: string;
    plateNumber: string;
    type: string;
  } | null;
};

export type Dispatcher = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  status: string;
  enabled: boolean;
};

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enabled: boolean;
};

export type DeliveryPage = {
  items: Delivery[];
  page: number;
  pageSize: number;
  total: number;
};

export type DriverPage = {
  items: Driver[];
  page: number;
  pageSize: number;
  total: number;
};

export type DashboardSummary = {
  totals: {
    deliveries: number;
    pending: number;
    assigned: number;
    pickedUp: number;
    inTransit: number;
    inProgress: number;
    accepted: number;
    delivered: number;
    failed: number;
    cancelled: number;
    drivers: number;
    availableDrivers: number;
    dispatchers: number;
    customers: number;
  };
  byStatus: { status: string; count: number }[];
  recent: Delivery[];
  pending: Delivery[];
  activities: {
    id: number;
    deliveryId: number;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: string | null;
  }[];
};
