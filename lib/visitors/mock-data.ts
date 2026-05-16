import type { VisitorRecord } from "./types";

const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, "0");
const d = String(today.getDate()).padStart(2, "0");
export const TODAY_YMD = `${y}-${m}-${d}`;

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yY = yesterday.getFullYear();
const yM = String(yesterday.getMonth() + 1).padStart(2, "0");
const yD = String(yesterday.getDate()).padStart(2, "0");
const YESTERDAY_YMD = `${yY}-${yM}-${yD}`;

/** Seed data for the Visitor Management dashboard (replace with API later). */
export const MOCK_VISITORS: VisitorRecord[] = [
  {
    id: "vis_001",
    fullName: "Grace Wanjiku",
    phoneNumber: "+254712345678",
    idPassportNumber: "12345678",
    vehiclePlateNumber: "KDA 123A",
    host: "James Otieno — HR",
    purposeOfVisit: "Job interview",
    visitDate: TODAY_YMD,
    visitTime: "09:30",
    status: "pending",
    qrCodeToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vis_002",
    fullName: "Peter Kamau",
    phoneNumber: "+254798765432",
    idPassportNumber: "A9876543",
    vehiclePlateNumber: "",
    host: "Sarah Mwangi — Finance",
    purposeOfVisit: "Vendor meeting",
    visitDate: TODAY_YMD,
    visitTime: "11:00",
    status: "approved",
    qrCodeToken: "FX-VIS-vis_002",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vis_003",
    fullName: "Amina Hassan",
    phoneNumber: "+254711223344",
    idPassportNumber: "33445566",
    vehiclePlateNumber: "KCB 456B",
    host: "David Kiprop — Operations",
    purposeOfVisit: "Site inspection",
    visitDate: TODAY_YMD,
    visitTime: "14:15",
    status: "checked_in",
    qrCodeToken: "FX-VIS-vis_003",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vis_004",
    fullName: "John Mburu",
    phoneNumber: "+254722334455",
    idPassportNumber: "55667788",
    vehiclePlateNumber: "",
    host: "Linda Chebet — Reception",
    purposeOfVisit: "Document delivery",
    visitDate: TODAY_YMD,
    visitTime: "08:45",
    status: "checked_out",
    qrCodeToken: "FX-VIS-vis_004",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "vis_005",
    fullName: "Fatima Ali",
    phoneNumber: "+254733445566",
    idPassportNumber: "77889900",
    vehiclePlateNumber: "KDG 789C",
    host: "Michael Ndungu — IT",
    purposeOfVisit: "System demo",
    visitDate: YESTERDAY_YMD,
    visitTime: "16:00",
    status: "rejected",
    qrCodeToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
