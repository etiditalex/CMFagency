"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  /** After user enters login verification code, call this to set user from session. */
  completeLoginVerification: () => Promise<void>;
  /** Send a new login verification code to the current session's email. */
  sendLoginVerificationCode: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applySessionIfVerified = async (session: { user: SupabaseUser } | null) => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    try {
      const res = await fetch("/api/auth/check-verified", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { verified?: boolean };
      if (json.verified) {
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
          emailVerified: session.user.email_confirmed_at !== null,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await applySessionIfVerified(session);
      } catch (error) {
        console.error("Error checking session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySessionIfVerified(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          return { success: false, error: "Please verify your email before logging in.", requiresVerification: true };
        }
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        const token = data.session.access_token;
        const sendRes = await fetch("/api/send-login-verification-code", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const sendJson = (await sendRes.json().catch(() => ({}))) as { error?: string };
        if (!sendRes.ok) {
          return { success: false, error: sendJson.error ?? "Failed to send verification code to your email." };
        }
        return { success: true, requiresVerification: true };
      }

      return { success: false, error: "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during login" };
    }
  };

  const sendLoginVerificationCode = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return { success: false, error: "Not signed in" };
      const res = await fetch("/api/send-login-verification-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { success: false, error: json.error ?? "Failed to send code" };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? "Failed to send code" };
    }
  };

  const completeLoginVerification = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
        emailVerified: session.user.email_confirmed_at !== null,
      };
      setUser(userData);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            verification_code: verificationCode,
          },
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Store verification code temporarily (in production, use a database)
        if (typeof window !== "undefined") {
          localStorage.setItem(`verification_code_${email}`, verificationCode);
          localStorage.setItem(`pending_verification_${email}`, JSON.stringify({
            email,
            name,
            userId: data.user.id,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
          }));
        }

        // Send verification code via email (non-blocking - registration succeeds even if email fails)
        console.log('Sending verification email to:', email);
        try {
          const emailResponse = await fetch('/api/send-verification-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              code: verificationCode,
              name,
            }),
          });

          if (!emailResponse.ok) {
            const emailResult = await emailResponse.json();
            console.warn('⚠️ Email sending failed (non-critical):', {
              status: emailResponse.status,
              error: emailResult.error,
            });
            // Registration still succeeds - email verification is optional
          } else {
            const emailResult = await emailResponse.json();
            console.log('✅ Verification email sent successfully to:', email, {
              emailId: emailResult.emailId,
            });
          }
        } catch (emailError: any) {
          console.warn('⚠️ Email sending error (non-critical):', emailError.message);
          // Registration succeeds regardless - email verification is optional
        }

        // Do not set user until they verify their email with the code we sent
        return { success: true };
      }

      return { success: false, error: "Registration failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during registration" };
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if code matches
      if (typeof window !== "undefined") {
        const storedCode = localStorage.getItem(`verification_code_${email}`);
        const pendingVerification = localStorage.getItem(`pending_verification_${email}`);
        
        if (!pendingVerification) {
          return { success: false, error: "No pending verification found. Please register again." };
        }

        const verification = JSON.parse(pendingVerification);
        
        // Check if code expired
        if (Date.now() > verification.expiresAt) {
          localStorage.removeItem(`verification_code_${email}`);
          localStorage.removeItem(`pending_verification_${email}`);
          return { success: false, error: "Verification code has expired. Please request a new one." };
        }

        if (storedCode !== code) {
          return { success: false, error: "Invalid verification code. Please try again." };
        }

        // Get current session to get userId
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return { success: false, error: "No active session. Please log in again." };
        }

        const userId = session.user.id;

        // Confirm email in Supabase using admin API
        try {
          const confirmResponse = await fetch('/api/confirm-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              userId,
            }),
          });

          const confirmResult = await confirmResponse.json();

          if (!confirmResponse.ok) {
            console.warn('Failed to confirm email in Supabase:', confirmResult.error);
            // Still proceed with verification, but Supabase won't show it as confirmed
          } else {
            console.log('Email confirmed successfully in Supabase');
          }
        } catch (confirmError) {
          console.warn('Error confirming email in Supabase:', confirmError);
          // Continue with verification even if Supabase confirmation fails
        }

        // Clear verification data
        localStorage.removeItem(`verification_code_${email}`);
        localStorage.removeItem(`pending_verification_${email}`);

        // Refresh session to get updated user data
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (refreshedSession?.user) {
          const userData = {
            id: refreshedSession.user.id,
            email: refreshedSession.user.email || "",
            name: refreshedSession.user.user_metadata?.name || refreshedSession.user.email?.split("@")[0] || "",
            emailVerified: refreshedSession.user.email_confirmed_at !== null, // Check Supabase's confirmation status
          };
          setUser(userData);
        }

        return { success: true };
      }

      return { success: false, error: "Verification failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during verification" };
    }
  };

  const resendVerificationCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Get user name from pending verification
      let userName = "User";
      if (typeof window !== "undefined") {
        const pendingVerification = localStorage.getItem(`pending_verification_${email}`);
        if (pendingVerification) {
          const verification = JSON.parse(pendingVerification);
          userName = verification.name || "User";
          verification.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
          localStorage.setItem(`pending_verification_${email}`, JSON.stringify(verification));
        }
      }

      // Update stored code
      if (typeof window !== "undefined") {
        localStorage.setItem(`verification_code_${email}`, verificationCode);
      }

      // Send verification code via email - MUST succeed
      console.log('📧 Resending verification email to:', email);
      const emailResponse = await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
          name: userName,
        }),
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok || !emailResult.success) {
        const errorMsg = emailResult.error || `Failed to send email (${emailResponse.status})`;
        console.error('❌ Failed to resend verification email:', {
          status: emailResponse.status,
          error: errorMsg,
          details: emailResult.details,
        });
        return { 
          success: false, 
          error: errorMsg || 'Failed to send verification email. Please check your email configuration.' 
        };
      }

      console.log('✅ Verification code email resent successfully to:', email, {
        emailId: emailResult.emailId,
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred while resending code" };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/track-application`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // OAuth redirect will happen automatically
      // The user will be redirected back to /application after successful authentication
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during Google sign-in" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await supabase.auth.signOut();
      setUser(null);
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('verification_code_') || key.startsWith('pending_verification_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear user state even if signOut fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        signInWithGoogle,
        verifyEmail,
        resendVerificationCode,
        completeLoginVerification,
        sendLoginVerificationCode,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


