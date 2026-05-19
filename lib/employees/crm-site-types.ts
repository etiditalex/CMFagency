export type CrmProjectStatus = "active" | "inactive";

export type CrmProjectRecord = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusM: number;
  status: CrmProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type CrmSiteVisitRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string | null;
  projectName: string;
  signInAt: string;
  signOutAt: string | null;
  signInLatitude: number;
  signInLongitude: number;
  signInAccuracyM: number | null;
  signOutLatitude: number | null;
  signOutLongitude: number | null;
  signOutAccuracyM: number | null;
  deviceLabel: string | null;
};

export type CrmSiteVisitRankEntry = {
  rank: number;
  employeeId: string;
  fullName: string;
  completedVisits: number;
  openVisit: boolean;
};
