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

export async function POST(request: NextRequest) {
  try {
    const { method, value, userId } = await request.json();

    // If userId is provided, fetch user's applications directly
    if (userId && !method && !value) {
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error querying applications by user_id:", error);
        return NextResponse.json(
          { error: "Failed to query applications" },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "No applications found for this user" },
          { status: 404 }
        );
      }

      // Return all applications or just the most recent
      const applications = data.map((app) => ({
        id: app.id,
        cmfAgencyId: app.cmf_agency_id,
        applicationType: app.application_type,
        status: app.status || "pending",
        name: app.name || app.full_name,
        submittedAt: app.created_at,
        notes: app.notes || app.comments,
      }));

      return NextResponse.json({
        success: true,
        applications: applications,
        application: applications[0], // Most recent for backward compatibility
      });
    }

    if (!method || !value) {
      return NextResponse.json(
        { error: "Method and value are required" },
        { status: 400 }
      );
    }

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

    let application = null;

    // Query based on tracking method
    if (method === "nationalId") {
      // Search in applications table by national_id
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("national_id", value)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error querying by national ID:", error);
        return NextResponse.json(
          { error: "Failed to query application" },
          { status: 500 }
        );
      }

      if (data) {
        application = data;
      }
    } else if (method === "phoneNumber") {
      // Search by phone number - need to find user first, then their applications
      const phoneNumber = value.replace(/\s+/g, ""); // Remove spaces

      // First, try to find user by phone
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .or(`phone.eq.${phoneNumber},phone.eq.${value}`)
        .limit(1)
        .single();

      if (userError && userError.code !== "PGRST116") {
        console.error("Error querying user by phone:", userError);
      }

      if (userData) {
        // Find applications by user_id
        const { data, error } = await supabaseAdmin
          .from("applications")
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error querying application by user:", error);
        } else if (data) {
          application = data;
        }
      }

      // Also try direct phone search in applications table
      if (!application) {
        const { data, error } = await supabaseAdmin
          .from("applications")
          .select("*")
          .or(`phone.eq.${phoneNumber},phone.eq.${value}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error querying by phone:", error);
        } else if (data) {
          application = data;
        }
      }
    } else if (method === "cmfAgencyId") {
      // Search by CMF Agency ID
      const { data, error } = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("cmf_agency_id", value)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error querying by CMF Agency ID:", error);
        return NextResponse.json(
          { error: "Failed to query application" },
          { status: 500 }
        );
      }

      if (data) {
        application = data;
      }
    }

    if (!application) {
      return NextResponse.json(
        { error: "No application found with the provided information" },
        { status: 404 }
      );
    }

    // Return application data (sanitize sensitive info if needed)
    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        cmfAgencyId: application.cmf_agency_id,
        applicationType: application.application_type,
        status: application.status || "pending",
        name: application.name || application.full_name,
        submittedAt: application.created_at,
        notes: application.notes || application.comments,
      },
    });
  } catch (error: any) {
    console.error("Track application error:", error);
    return NextResponse.json(
      { error: "An error occurred while tracking your application" },
      { status: 500 }
    );
  }
}
