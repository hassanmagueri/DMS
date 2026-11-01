export function homeForRole(role: string) {
  if (role === "DRIVER") return "/driver";
  if (role === "CUSTOMER") return "/customer";
  return "/";
}

export function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

export function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAddress(address: {
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
}) {
  return [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

const operatorActions: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
};

const driverActions: Record<string, string[]> = {
  ACCEPTED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
};

const customerActions: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["CANCELLED"],
};

export function allowedActions(status: string, role: string) {
  if (role === "DRIVER") return driverActions[status] ?? [];
  if (role === "CUSTOMER") return customerActions[status] ?? [];
  return operatorActions[status] ?? [];
}

export function canAssign(status: string) {
  return status === "PENDING" || status === "REJECTED" || status === "ASSIGNED";
}

export function canEditDetails(status: string) {
  return status === "PENDING" || status === "ASSIGNED" || status === "ACCEPTED" || status === "REJECTED";
}
