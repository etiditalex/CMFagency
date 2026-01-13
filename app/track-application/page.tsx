"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, IdCard, Phone, Hash, CheckCircle, XCircle, Clock, ArrowLeft, ArrowRight, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type TrackingMethod = "nationalId" | "phoneNumber" | "cmfAgencyId";

export default function TrackApplicationPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>("nationalId");
  const [trackingValue, setTrackingValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applicationData, setApplicationData] = useState<any>(null);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [loadingUserApps, setLoadingUserApps] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setApplicationData(null);
    setLoading(true);

    if (!trackingValue.trim()) {
      setError("Please enter a value to track your application");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/track-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: trackingMethod,
          value: trackingValue.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to track application");
        setLoading(false);
        return;
      }

      if (data.application) {
        setApplicationData(data.application);
      } else {
        setError("No application found with the provided information");
      }
    } catch (err: any) {
      setError("An error occurred while tracking your application. Please try again.");
      console.error("Track application error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
      case "approved":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "rejected":
      case "declined":
        return <XCircle className="w-6 h-6 text-red-600" />;
      case "pending":
      case "under review":
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
      case "declined":
        return "bg-red-100 text-red-800 border-red-300";
      case "pending":
      case "under review":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Fetch user's applications when logged in
  useEffect(() => {
    if (isAuthenticated && user?.id && !authLoading) {
      fetchUserApplications();
    }
  }, [isAuthenticated, user?.id, authLoading]);

  const fetchUserApplications = async () => {
    setLoadingUserApps(true);
    setError("");
    try {
      const response = await fetch("/api/track-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.applications) {
        setUserApplications(data.applications);
        // Auto-select the most recent application
        if (data.applications.length > 0) {
          setApplicationData(data.application || data.applications[0]);
        }
      } else {
        // No applications found is not an error
        setUserApplications([]);
      }
    } catch (err: any) {
      console.error("Error fetching user applications:", err);
      // Don't show error for logged-in users with no applications
    } finally {
      setLoadingUserApps(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <section className="section-padding">
        <div className="container-custom max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Track Your Application
              </h1>
              <p className="text-gray-600 mb-8">
                {isAuthenticated
                  ? "View your application status or track using other methods below"
                  : "Check the status of your application using one of the methods below"}
              </p>

              {/* Logged in user's applications */}
              {isAuthenticated && (
                <div className="mb-8">
                  {loadingUserApps ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading your applications...</p>
                    </div>
                  ) : userApplications.length > 0 ? (
                    <div className="bg-primary-50 rounded-lg p-6 border border-primary-200 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-bold text-gray-900">Your Applications</h2>
                      </div>
                      <div className="space-y-4">
                        {userApplications.map((app, index) => (
                          <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                              applicationData?.id === app.id
                                ? "border-primary-600 shadow-md"
                                : "border-gray-200 hover:border-primary-300"
                            }`}
                            onClick={() => setApplicationData(app)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(app.status)}
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {app.applicationType || "Application"} - {app.cmfAgencyId}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "N/A"}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-sm font-medium px-3 py-1 rounded-full border ${getStatusColor(app.status)}`}>
                                {app.status || "Pending"}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6 text-center">
                      <p className="text-gray-600 mb-4">You haven't submitted any applications yet.</p>
                      <Link
                        href="/application"
                        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                      >
                        Submit Your First Application
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Login prompt for non-authenticated users */}
              {!isAuthenticated && !authLoading && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
                  <p className="text-gray-700 mb-4">
                    <strong>Tip:</strong> Log in to automatically view all your applications!
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    Log In Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              )}

              {/* Tracking Method Selection */}
              <div className="space-y-3 mb-6">
                {/* National ID Option */}
                <button
                  onClick={() => setTrackingMethod("nationalId")}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    trackingMethod === "nationalId"
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          trackingMethod === "nationalId"
                            ? "border-primary-600 bg-primary-600"
                            : "border-gray-300"
                        }`}
                      >
                        {trackingMethod === "nationalId" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">National ID Number</div>
                        <div className="text-sm text-gray-600">Use your Kenyan ID number</div>
                      </div>
                    </div>
                    <IdCard
                      className={`w-6 h-6 ${
                        trackingMethod === "nationalId" ? "text-primary-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                </button>

                {/* Phone Number Option */}
                <button
                  onClick={() => setTrackingMethod("phoneNumber")}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    trackingMethod === "phoneNumber"
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          trackingMethod === "phoneNumber"
                            ? "border-primary-600 bg-primary-600"
                            : "border-gray-300"
                        }`}
                      >
                        {trackingMethod === "phoneNumber" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">Phone Number</div>
                        <div className="text-sm text-gray-600">Use your registered phone number</div>
                      </div>
                    </div>
                    <Phone
                      className={`w-6 h-6 ${
                        trackingMethod === "phoneNumber" ? "text-primary-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                </button>

                {/* CMF Agency ID Option */}
                <button
                  onClick={() => setTrackingMethod("cmfAgencyId")}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    trackingMethod === "cmfAgencyId"
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          trackingMethod === "cmfAgencyId"
                            ? "border-primary-600 bg-primary-600"
                            : "border-gray-300"
                        }`}
                      >
                        {trackingMethod === "cmfAgencyId" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">CMF Agency ID</div>
                        <div className="text-sm text-gray-600">
                          Use your CMF Agency application ID (e.g., CMF-000001)
                        </div>
                      </div>
                    </div>
                    <Hash
                      className={`w-6 h-6 ${
                        trackingMethod === "cmfAgencyId" ? "text-primary-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Input Field */}
              <form onSubmit={handleTrack} className="space-y-4">
                <div>
                  <label
                    htmlFor="tracking-input"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {trackingMethod === "nationalId" && "Enter your National ID Number"}
                    {trackingMethod === "phoneNumber" && "Enter your Phone Number"}
                    {trackingMethod === "cmfAgencyId" && "Enter your CMF Agency ID"}
                  </label>
                  <input
                    id="tracking-input"
                    type="text"
                    value={trackingValue}
                    onChange={(e) => setTrackingValue(e.target.value)}
                    placeholder={
                      trackingMethod === "nationalId"
                        ? "e.g., 12345678"
                        : trackingMethod === "phoneNumber"
                        ? "e.g., +254 700 000 000"
                        : "e.g., CMF-000001"
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-5 h-5" />
                  {loading ? "Tracking..." : "Track Application"}
                </button>
              </form>

              {/* Application Status Display */}
              {applicationData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Application Status</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(applicationData.status)}
                        <div>
                          <div className="font-semibold text-gray-900">Status</div>
                          <div className={`text-sm font-medium px-3 py-1 rounded-full border inline-block mt-1 ${getStatusColor(applicationData.status)}`}>
                            {applicationData.status || "Pending"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Application Type</div>
                        <div className="font-semibold text-gray-900">
                          {applicationData.applicationType || "N/A"}
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Submitted Date</div>
                        <div className="font-semibold text-gray-900">
                          {applicationData.submittedAt
                            ? new Date(applicationData.submittedAt).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                      {applicationData.cmfAgencyId && (
                        <div className="p-4 bg-white rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">CMF Agency ID</div>
                          <div className="font-semibold text-gray-900">
                            {applicationData.cmfAgencyId}
                          </div>
                        </div>
                      )}
                      {applicationData.name && (
                        <div className="p-4 bg-white rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Applicant Name</div>
                          <div className="font-semibold text-gray-900">{applicationData.name}</div>
                        </div>
                      )}
                    </div>

                    {applicationData.notes && (
                      <div className="p-4 bg-white rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Notes</div>
                        <div className="text-gray-900">{applicationData.notes}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Don't have an application yet? */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="text-center mb-6">
                  <p className="text-gray-700 font-medium mb-4">Don't have an application yet?</p>
                  <Link
                    href="/application"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    Apply Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Need help section */}
                <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                  <p className="text-gray-900 font-semibold mb-4 text-center">
                    Need help with your application?
                  </p>
                  <div className="space-y-3">
                    <a
                      href="tel:+254797777347"
                      className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      Call us: +254 797 777347
                    </a>
                    <a
                      href="mailto:info@cmfagency.co.ke"
                      className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      Email: info@cmfagency.co.ke
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
