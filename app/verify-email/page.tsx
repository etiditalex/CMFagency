"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationCode, isAuthenticated, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Get email from URL params or localStorage
    const emailParam = searchParams?.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else if (typeof window !== "undefined") {
      // Try to get from pending verification
      const keys = Object.keys(localStorage);
      const pendingKey = keys.find(key => key.startsWith("pending_verification_"));
      if (pendingKey) {
        const verification = JSON.parse(localStorage.getItem(pendingKey) || "{}");
        if (verification.email) {
          setEmail(verification.email);
        }
      }
    }

    // Only redirect if email is verified
    if (isAuthenticated && user?.emailVerified) {
      router.push("/application");
    }
  }, [searchParams, isAuthenticated, router, user, authLoading]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    if (!email || !code) {
      setError("Please enter your email and verification code");
      setLoading(false);
      return;
    }

    if (code.length !== 6) {
      setError("Verification code must be 6 digits");
      setLoading(false);
      return;
    }

    const result = await verifyEmail(email, code);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/application");
      }, 2000);
    } else {
      setError(result.error || "Verification failed. Please try again.");
    }
  };

  const handleResendCode = async () => {
    setError("");
    setResendSuccess(false);
    setResending(true);

    if (!email) {
      setError("Please enter your email address");
      setResending(false);
      return;
    }

    try {
      console.log('🔄 Resending verification code to:', email);
      const result = await resendVerificationCode(email);
      
      if (result.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
        console.log('✅ Resend successful');
      } else {
        const errorMsg = result.error || "Failed to resend code. Please check your email configuration or try again later.";
        setError(errorMsg);
        console.error('❌ Resend failed:', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred while resending the code. Please try again.";
      setError(errorMsg);
      console.error('❌ Resend error:', err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block mb-4">
            <div className="relative w-48 h-16 mx-auto">
              <Image
                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"
                alt="Changer Fusions Logo"
                fill
                className="object-contain filter brightness-0 invert"
              />
            </div>
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
            Changer Fusions
          </h1>
          <p className="text-xl text-white/90">
            Verify Your Email
          </p>
        </motion.div>

        {/* Verification Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-8 md:p-10"
        >
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-600 mb-6">
                Your email has been successfully verified. Redirecting to application...
              </p>
            </div>
          ) : (
            <>
              {/* Welcome Icon */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📧</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Enter Verification Code
                </h2>
                <p className="text-gray-600">
                  We've sent a 6-digit verification code to your email address. Please check your inbox and enter the code below.
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              {resendSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verification code has been resent to your email. Please check your inbox.
                </div>
              )}

              {/* Verification Form */}
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-primary-600" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || code.length !== 6}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending || !email}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        Didn't receive the code? <span className="ml-1 underline">Resend</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Back to Home Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center justify-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

