export function homeForRole(role: string) {
  if (role === "DRIVER") return "/driver";
  if (role === "CUSTOMER") return "/customer";
  return "/";
}

export function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function waitingMs(createdAt: string, now = Date.now()) {
  return Math.max(0, now - new Date(createdAt).getTime());
}

export function isLate(createdAt: string, now = Date.now()) {
  return waitingMs(createdAt, now) > DAY;
}

export function waitingLabel(createdAt: string, now = Date.now()) {
  const minutes = Math.floor(waitingMs(createdAt, now) / MINUTE);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 min" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
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
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const operatorActions: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  FAILED: ["PENDING"],
};

const driverActions: Record<string, string[]> = {
  ACCEPTED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
};

const failureReasons: Record<string, string> = {
  NOBODY_HOME: "Nobody home",
  WRONG_ADDRESS: "Wrong address",
  REFUSED: "Customer refused",
  UNREACHABLE: "Could not reach the address",
};

export function failureReasonLabel(reason: string | null) {
  if (!reason) return "";
  return failureReasons[reason] ?? reason;
}

export function ratingText(average: number | null, count: number) {
  if (!count || average == null) return "No ratings yet";
  return `${average.toFixed(1)} from ${count} ${count === 1 ? "rating" : "ratings"}`;
}

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
