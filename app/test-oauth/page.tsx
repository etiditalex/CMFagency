"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";
import Link from "next/link";

export default function TestOAuthPage() {
  const { isAuthenticated, user, signInWithGoogle, loading } = useAuth();
  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message: string;
    error?: string;
  }>({ status: "idle", message: "" });
  const [supabaseConfig, setSupabaseConfig] = useState<{
    url: string;
    hasAnonKey: boolean;
  } | null>(null);

  useEffect(() => {
    // Check Supabase configuration (client-side only)
    if (typeof window !== "undefined") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      setSupabaseConfig({ url, hasAnonKey });
    }
  }, []);

  const testGoogleOAuth = async () => {
    setTestResult({ status: "testing", message: "Testing Google OAuth..." });
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        setTestResult({
          status: "success",
          message: "Google OAuth initiated successfully! You should be redirected to Google's sign-in page.",
        });
      } else {
        setTestResult({
          status: "error",
          message: "Google OAuth failed to initiate",
          error: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
      setTestResult({
        status: "error",
        message: "Error testing Google OAuth",
        error: error.message || "Unknown error occurred",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 md:pt-40 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Google OAuth Test Page</h1>
          <p className="text-gray-600 mb-8">
            Use this page to test and debug Google OAuth authentication
          </p>

          {/* Configuration Status */}
          <div className="mb-8 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Configuration Status</h2>
            
            <div className="space-y-3">
              {/* Supabase URL */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Supabase URL</div>
                  <div className="text-sm text-gray-600">
                    {supabaseConfig?.url ? (
                      <span className="font-mono text-xs">{supabaseConfig.url.substring(0, 30)}...</span>
                    ) : (
                      "Not configured"
                    )}
                  </div>
                </div>
                {supabaseConfig?.url ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>

              {/* Supabase Anon Key */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Supabase Anon Key</div>
                  <div className="text-sm text-gray-600">
                    {supabaseConfig?.hasAnonKey ? "Configured" : "Not configured"}
                  </div>
                </div>
                {supabaseConfig?.hasAnonKey ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>

              {/* Google Provider Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Google Provider</div>
                  <div className="text-sm text-gray-600">
                    Check Supabase Dashboard → Authentication → Providers
                  </div>
                </div>
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Current User Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current User Status</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Authenticated</span>
                </div>
                <div className="text-sm text-gray-700">
                  <div><strong>Email:</strong> {user?.email || "N/A"}</div>
                  <div><strong>Name:</strong> {user?.name || "N/A"}</div>
                  <div><strong>ID:</strong> {user?.id || "N/A"}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Not authenticated</span>
                </div>
              </div>
            )}
          </div>

          {/* Test Button */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Google OAuth</h2>
            <button
              onClick={testGoogleOAuth}
              disabled={testResult.status === "testing" || loading}
              className="w-full md:w-auto px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testResult.status === "testing" ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Google Sign-In"
              )}
            </button>
          </div>

          {/* Test Result */}
          {testResult.status !== "idle" && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Result</h2>
              <div
                className={`p-4 rounded-lg border ${
                  testResult.status === "success"
                    ? "bg-green-50 border-green-200"
                    : testResult.status === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : testResult.status === "error" ? (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <Loader className="w-5 h-5 text-yellow-600 animate-spin mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">{testResult.message}</div>
                    {testResult.error && (
                      <div className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded mt-2">
                        {testResult.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Configure Google OAuth in Supabase</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Go to your Supabase Dashboard: <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">https://app.supabase.com</a></li>
                  <li>Navigate to <strong>Authentication</strong> → <strong>Providers</strong></li>
                  <li>Find <strong>Google</strong> and click <strong>Enable</strong></li>
                  <li>Enter your Google OAuth credentials (see step 2)</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Get Google OAuth Credentials</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Google Cloud Console</a></li>
                  <li>Create a project or select existing one</li>
                  <li>Navigate to <strong>APIs & Services</strong> → <strong>Credentials</strong></li>
                  <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
                  <li>Configure OAuth consent screen (if needed)</li>
                  <li>Add authorized redirect URI: <code className="bg-white px-2 py-1 rounded text-xs">https://[your-supabase-project].supabase.co/auth/v1/callback</code></li>
                  <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Share Credentials (Optional)</h3>
                <p className="text-sm text-gray-700 mb-2">
                  If you want help configuring, share:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Your Supabase Project URL</li>
                  <li>Google OAuth Client ID</li>
                  <li>Google OAuth Client Secret (keep this secure!)</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  ⚠️ <strong>Note:</strong> Never share credentials publicly. Only share in secure channels.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Login Page
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
