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
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkUser = async () => {
      try {
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
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
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

      if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
          emailVerified: data.user.email_confirmed_at !== null,
        };
        setUser(userData);
        return { success: true };
      }

      return { success: false, error: "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during login" };
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

        // Send verification code via email
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

          const emailResult = await emailResponse.json();
          
          if (!emailResponse.ok) {
            console.error('Failed to send verification email:', {
              status: emailResponse.status,
              error: emailResult.error,
              details: emailResult.details,
            });
            // Registration still succeeds, code is available on verification page
          } else {
            console.log('Verification email sent successfully to:', email, {
              emailId: emailResult.emailId,
            });
          }
        } catch (emailError: any) {
          console.error('Error sending verification email:', {
            error: emailError.message,
            stack: emailError.stack,
          });
          // Don't fail registration if email fails - code is still available on verification page
        }

        // Auto-login the user (they can access application but need to verify email)
        const userData = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.name || name,
          emailVerified: false, // Not verified yet
        };
        setUser(userData);

        return { success: true, user: userData };
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

        // Verify email in Supabase
        // Note: In production, you would verify the code on the backend
        // For now, we'll confirm the email manually
        const { error: verifyError } = await supabase.auth.updateUser({
          data: { email_verified: true }
        });

        if (verifyError) {
          // If update fails, try to verify using the token from email
          // For now, we'll just mark as verified locally
          console.warn("Could not update user verification status:", verifyError);
        }

        // Clear verification data
        localStorage.removeItem(`verification_code_${email}`);
        localStorage.removeItem(`pending_verification_${email}`);

        // Update user metadata to mark email as verified
        // Note: This is a custom verification system, not Supabase's built-in email confirmation
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Update user metadata
          await supabase.auth.updateUser({
            data: { 
              email_verified: true,
              email_verified_at: new Date().toISOString()
            }
          });
          
          // Refresh session to get updated user data
          const { data: { session: refreshedSession } } = await supabase.auth.getSession();
          if (refreshedSession?.user) {
            const userData = {
              id: refreshedSession.user.id,
              email: refreshedSession.user.email || "",
              name: refreshedSession.user.user_metadata?.name || refreshedSession.user.email?.split("@")[0] || "",
              emailVerified: true, // Manually set since we're using custom verification
            };
            setUser(userData);
          }
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

      // Send verification code via email
      try {
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
        
        if (!emailResponse.ok) {
          console.error('Failed to resend verification email:', {
            status: emailResponse.status,
            error: emailResult.error,
            details: emailResult.details,
          });
          // Still return success as code is updated and available on verification page
        } else {
          console.log('Verification code email resent successfully to:', email, {
            emailId: emailResult.emailId,
          });
        }
      } catch (emailError: any) {
        console.error('Error resending verification email:', {
          error: emailError.message,
          stack: emailError.stack,
        });
        // Still return success as code is updated
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred while resending code" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyEmail,
        resendVerificationCode,
        logout,
        isAuthenticated: !!user, // Allow access even if email not verified
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


