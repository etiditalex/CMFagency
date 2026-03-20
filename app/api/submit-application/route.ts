import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";
import {
  APPLICATION_DOCS_BUCKET,
  buildSubmissionMeta,
  type ClientFileValidation,
} from "@/lib/application-documents";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const FILE_FIELDS = [
  "idFront",
  "idBack",
  "passportPhoto",
  "certificateOfGoodConduct",
  "cv",
] as const;

type FileField = (typeof FILE_FIELDS)[number];

function generateCMFAgencyId(): string {
  const prefix = "CMF";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}${random}`;
}

async function uploadApplicationFile(
  admin: SupabaseClient,
  cmfAgencyId: string,
  field: FileField,
  file: File
): Promise<{ storagePath: string; fileName: string; size: number; mimeType: string } | { error: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { error: `${field} exceeds 5MB limit` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const objectPath = `${cmfAgencyId}/${field}/${Date.now()}_${safeName}`;
  const mimeType = file.type || "application/octet-stream";

  const { error } = await admin.storage.from(APPLICATION_DOCS_BUCKET).upload(objectPath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    console.error("application storage upload:", field, error.message);
    return {
      error: `Could not store ${field}. Ensure the Storage bucket "${APPLICATION_DOCS_BUCKET}" exists (see database patch).`,
    };
  }

  return {
    storagePath: objectPath,
    fileName: file.name,
    size: file.size,
    mimeType,
  };
}

type MetaPayload = {
  userId?: string;
  firstName?: string;
  secondName?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  nationalId?: string;
  gender?: string;
  age?: string | number;
  county?: string;
  passport?: string;
  applicationType?: string;
  jobPosition?: string;
  fileValidations?: Record<string, ClientFileValidation>;
};

async function insertApplication(
  admin: SupabaseClient,
  params: {
    cmfAgencyId: string;
    userId: string | null;
    first: string;
    second: string;
    email: string;
    phone: string;
    idNumber: string;
    jobPosition: string;
    county: string;
    applicationType: string;
    personal_details: Record<string, unknown>;
    documents: Record<string, unknown>;
  }
) {
  const fullName = params.first ? `${params.first} ${params.second}`.trim() : null;
  const applicationRecord = {
    cmf_agency_id: params.cmfAgencyId,
    user_id: params.userId,
    national_id: params.idNumber || null,
    phone: params.phone || null,
    email: params.email || null,
    name: fullName,
    full_name: fullName,
    application_type: params.applicationType || "job",
    job_position: params.jobPosition || null,
    status: "pending",
    personal_details: params.personal_details,
    documents: params.documents,
    notes: null,
    created_at: new Date().toISOString(),
  };

  return admin.from("applications").insert([applicationRecord]).select().single();
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: "Database connection not configured",
          details: "Missing Supabase URL or service role key.",
        },
        { status: 500 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    /** Multipart: files + meta JSON; requires Authorization. */
    if (contentType.includes("multipart/form-data")) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        return NextResponse.json({ error: "Sign in is required to submit your application." }, { status: 401 });
      }

      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser(token);
      if (userErr || !userData?.user?.id) {
        return NextResponse.json({ error: "Invalid or expired session. Please sign in again." }, { status: 401 });
      }

      const formData = await request.formData();
      const metaRaw = formData.get("meta");
      if (typeof metaRaw !== "string") {
        return NextResponse.json({ error: "Missing application metadata" }, { status: 400 });
      }

      let meta: MetaPayload;
      try {
        meta = JSON.parse(metaRaw) as MetaPayload;
      } catch {
        return NextResponse.json({ error: "Invalid metadata JSON" }, { status: 400 });
      }

      const metaUserId = typeof meta.userId === "string" ? meta.userId.trim() : "";
      if (!metaUserId || metaUserId !== userData.user.id) {
        return NextResponse.json({ error: "Profile mismatch. Please refresh and try again." }, { status: 403 });
      }

      const cmfAgencyId = generateCMFAgencyId();
      const requiredFields: FileField[] = ["idFront", "idBack", "cv"];
      for (const r of requiredFields) {
        const f = formData.get(r);
        if (!f || !(f instanceof File) || f.size === 0) {
          return NextResponse.json(
            { error: `Missing required file: ${r} (ID front, ID back, and CV are required).` },
            { status: 400 }
          );
        }
      }

      const present = {
        idFront: true,
        idBack: true,
        cv: true,
        passportPhoto: false,
        certificateOfGoodConduct: false,
      };
      for (const opt of ["passportPhoto", "certificateOfGoodConduct"] as const) {
        const f = formData.get(opt);
        if (f instanceof File && f.size > 0) present[opt] = true;
      }

      const documents: Record<string, unknown> = {};

      for (const field of FILE_FIELDS) {
        const f = formData.get(field);
        if (!f || !(f instanceof File) || f.size === 0) continue;
        const up = await uploadApplicationFile(supabaseAdmin, cmfAgencyId, field, f);
        if ("error" in up) {
          return NextResponse.json({ error: up.error }, { status: 503 });
        }
        documents[field] = {
          fileName: up.fileName,
          size: up.size,
          mimeType: up.mimeType,
          storagePath: up.storagePath,
        };
      }

      const validations = meta.fileValidations ?? {};
      const submissionMeta = buildSubmissionMeta(present, validations);
      documents._meta = submissionMeta;

      const first = sanitizeText(meta.firstName);
      const second = sanitizeText(meta.secondName);
      const email = sanitizeText(meta.email);
      const phone = sanitizeText(meta.phone);
      const idNumber = sanitizeText(meta.idNumber ?? meta.nationalId);
      const jobPosition = sanitizeText(meta.jobPosition);
      const county = sanitizeText(meta.county);
      const applicationType = sanitizeText(meta.applicationType) || "job";

      const personal_details = {
        firstName: first,
        secondName: second,
        email,
        phone,
        idNumber,
        gender: sanitizeText(meta.gender),
        age: meta.age,
        county,
        passport: sanitizeText(meta.passport),
      };

      const { data, error } = await insertApplication(supabaseAdmin, {
        cmfAgencyId,
        userId: metaUserId,
        first,
        second,
        email,
        phone,
        idNumber,
        jobPosition,
        county,
        applicationType,
        personal_details,
        documents,
      });

      if (error) {
        console.error("Error saving application:", error);
        return NextResponse.json(
          { error: "Failed to save application", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        applicationId: data.id,
        cmfAgencyId,
        message: "Application submitted successfully",
      });
    }

    /** Legacy JSON body (filenames only, no binary). */
    const applicationData = await request.json();
    const cmfAgencyId = generateCMFAgencyId();

    const first = sanitizeText(applicationData.firstName);
    const second = sanitizeText(applicationData.secondName);
    const email = sanitizeText(applicationData.email);
    const phone = sanitizeText(applicationData.phone);
    const idNumber = sanitizeText(applicationData.idNumber ?? applicationData.nationalId);
    const name = sanitizeText(applicationData.name);
    const jobPosition = sanitizeText(applicationData.jobPosition);
    const county = sanitizeText(applicationData.county);
    const fullName = first ? `${first} ${second}`.trim() : name || null;

    const applicationRecord = {
      cmf_agency_id: cmfAgencyId,
      user_id: applicationData.userId || null,
      national_id: idNumber || null,
      phone: phone || null,
      email: email || null,
      name: fullName || null,
      full_name: fullName || null,
      application_type: sanitizeText(applicationData.applicationType) || "job",
      job_position: jobPosition || null,
      status: "pending",
      personal_details: {
        firstName: first,
        secondName: second,
        email,
        phone,
        idNumber,
        gender: sanitizeText(applicationData.gender),
        age: applicationData.age,
        county,
        passport: sanitizeText(applicationData.passport),
      },
      documents: {
        passportPhoto: applicationData.documents?.passportPhoto?.name || null,
        idFront: applicationData.documents?.idFront?.name || null,
        idBack: applicationData.documents?.idBack?.name || null,
        certificateOfGoodConduct: applicationData.documents?.certificateOfGoodConduct?.name || null,
        cv: applicationData.jobSelection?.cv?.name || null,
        _meta: {
          submitted_via: "legacy_json",
          submitted_at: new Date().toISOString(),
          documents_complete: false,
          required_present: { id_front: false, id_back: false, cv: false },
          client_validation: {},
          qualification_hint: "pending_review" as const,
        },
      },
      notes: null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("applications")
      .insert([applicationRecord])
      .select()
      .single();

    if (error) {
      console.error("Error saving application:", error);
      return NextResponse.json(
        { error: "Failed to save application", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      applicationId: data.id,
      cmfAgencyId,
      message: "Application submitted successfully",
    });
  } catch (error: unknown) {
    console.error("Submit application error:", error);
    return NextResponse.json(
      { error: "An error occurred while submitting your application" },
      { status: 500 }
    );
  }
}
