// TODO(backend): hard-coded for the Inception prototype.
export type DeviceType = "Tablet" | "Phone";
export type DeviceStatus = "Active" | "Revoked";
export type Device = {
  id: number;
  name: string;
  type: DeviceType;
  assignedTo: string;
  lastSeen: string;
  status: DeviceStatus;
};

export const initialDevices: Device[] = [
  { id: 1, name: "Mixing line tablet", type: "Tablet", assignedTo: "Shift A", lastSeen: "2 min ago", status: "Active" },
  { id: 2, name: "Packaging tablet", type: "Tablet", assignedTo: "Shift B", lastSeen: "Yesterday", status: "Active" },
  { id: 3, name: "Supervisor iPad", type: "Tablet", assignedTo: "Riley Chen", lastSeen: "5 min ago", status: "Active" },
  { id: 4, name: "Loading dock phone", type: "Phone", assignedTo: "Shift B", lastSeen: "3 days ago", status: "Revoked" },
];

export const deviceTypes: DeviceType[] = ["Tablet", "Phone"];

// TODO(backend): hard-coded for the Inception prototype.
export const deviceTeams = ["Shift A", "Shift B", "Supervisors"];

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function pairingCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
