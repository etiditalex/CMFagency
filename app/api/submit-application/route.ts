import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
  console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅ Set" : "❌ Missing");
  console.error("Please check ENV_SETUP_TRACK_APPLICATION.md for setup instructions");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Generate CMF Agency ID
function generateCMFAgencyId(): string {
  const prefix = "CMF";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const applicationData = await request.json();

    if (!supabaseAdmin) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
      
      console.error("Missing environment variables:", missingVars.join(", "));
      return NextResponse.json(
        { 
          error: "Database connection not configured",
          details: `Missing: ${missingVars.join(", ")}. Please add these to your .env.local file and restart the server.`
        },
        { status: 500 }
      );
    }

    // Generate CMF Agency ID
    const cmfAgencyId = generateCMFAgencyId();

    // Prepare application data for database
    const applicationRecord = {
      cmf_agency_id: cmfAgencyId,
      user_id: applicationData.userId || null,
      national_id: applicationData.idNumber || applicationData.nationalId || null,
      phone: applicationData.phone || null,
      email: applicationData.email || null,
      name: applicationData.firstName
        ? `${applicationData.firstName} ${applicationData.secondName || ""}`.trim()
        : applicationData.name || null,
      full_name: applicationData.firstName
        ? `${applicationData.firstName} ${applicationData.secondName || ""}`.trim()
        : applicationData.name || null,
      application_type: applicationData.applicationType || "job",
      job_position: applicationData.jobPosition || null,
      status: "pending",
      personal_details: {
        firstName: applicationData.firstName,
        secondName: applicationData.secondName,
        email: applicationData.email,
        phone: applicationData.phone,
        idNumber: applicationData.idNumber,
        gender: applicationData.gender,
        age: applicationData.age,
        county: applicationData.county,
        passport: applicationData.passport,
      },
      documents: {
        passportPhoto: applicationData.documents?.passportPhoto?.name || null,
        idFront: applicationData.documents?.idFront?.name || null,
        idBack: applicationData.documents?.idBack?.name || null,
        certificateOfGoodConduct: applicationData.documents?.certificateOfGoodConduct?.name || null,
        cv: applicationData.jobSelection?.cv?.name || null,
      },
      notes: null,
      created_at: new Date().toISOString(),
    };

    // Insert into applications table
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
      cmfAgencyId: cmfAgencyId,
      message: "Application submitted successfully",
    });
  } catch (error: any) {
    console.error("Submit application error:", error);
    return NextResponse.json(
      { error: "An error occurred while submitting your application" },
      { status: 500 }
    );
  }
}
