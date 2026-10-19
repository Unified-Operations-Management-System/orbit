// TODO(backend): hard-coded for the Inception prototype.
export const company = {
  name: "Invex Foods Canada",
  legalName: "Invex Foods Canada Corporation",
  industry: "Food manufacturing (NAICS 311)",
  address: "120 Example Rd, Mississauga, ON",
  phone: "(905) 555-0142",
  timezone: "America/Toronto",
};

export const orgSettings = {
  payPeriod: "biweekly",
  weekStart: "monday",
  inviteExpiryDays: "7",
  requireApproval: true,
  shiftLengthHours: "8",
};

export type Option = { value: string; label: string };

export const payPeriodOptions: Option[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semimonthly", label: "Semimonthly" },
];

export const weekStartOptions: Option[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
];

export const inviteExpiryOptions: Option[] = [
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];

export const timezoneOptions: Option[] = [
  "America/Toronto",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
].map((tz) => ({ value: tz, label: tz }));
