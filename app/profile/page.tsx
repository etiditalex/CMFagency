"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Calendar, Edit, Settings, ShoppingBag, Ticket, Heart, CreditCard, LogOut, Lock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "events" | "settings">("overview");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in (check localStorage or session)
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          // Validate that the data is valid JSON and has required fields
          const parsed = JSON.parse(userData);
          if (parsed && parsed.email && parsed.name) {
            setIsAuthenticated(true);
          } else {
            // Invalid data - clear it
            localStorage.removeItem("user");
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Corrupted data - clear it
        localStorage.removeItem("user");
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    router.push("/");
  };


  // Get user info only when authenticated
  const getUserInfo = () => {
    if (!isAuthenticated) {
      return null;
    }
    
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        // Validate required fields
        if (parsed && parsed.email && parsed.name) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      // Clear corrupted data
      localStorage.removeItem("user");
      setIsAuthenticated(false);
    }
    
    return null;
  };

  const userInfo = getUserInfo();

  const stats = [
    { label: "Events Attended", value: "12", icon: Ticket },
    { label: "Orders Placed", value: "8", icon: ShoppingBag },
    { label: "Favorites", value: "5", icon: Heart },
  ];

  const recentOrders = [
    { id: "ORD-001", item: "Event Ticket - Mr and Ms Deaf Kenya", date: "2024-09-10", status: "Completed", amount: "KSh 3,000" },
    { id: "ORD-002", item: "Merchandise - Classic T-Shirt", date: "2024-09-05", status: "Delivered", amount: "KSh 2,500" },
    { id: "ORD-003", item: "Event Ticket - Corporate Launch", date: "2024-08-28", status: "Completed", amount: "KSh 5,000" },
  ];

  const upcomingEvents = [
    { id: 1, title: "Marketing Society Networking Mixer", date: "2024-10-15", location: "Nairobi" },
    { id: 2, title: "Brand Activation Workshop", date: "2024-10-22", location: "Mombasa" },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated or if userInfo is invalid
  if (!isAuthenticated || !userInfo) {
    // Clear any invalid data
    if (!isAuthenticated && localStorage.getItem("user")) {
      localStorage.removeItem("user");
    }
    
    return (
      <>
        <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center"
          >
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in or create an account to access your profile and view your account information.
            </p>
            <div className="flex flex-row gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl"
              >
                Sign In / Sign Up
              </Link>
              <button
                onClick={() => router.push("/")}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Go Home
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[300px] md:min-h-[400px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg"
            alt="Profile"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center space-x-6"
          >
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={userInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name)}&background=6366f1&color=fff&size=200`}
                alt={userInfo.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{userInfo.name}</h1>
              <p className="text-white/90 flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{userInfo.email}</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <nav className="space-y-2">
                {[
                  { id: "overview", label: "Overview", icon: User },
                  { id: "orders", label: "My Orders", icon: ShoppingBag },
                  { id: "events", label: "My Events", icon: Ticket },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      activeTab === tab.id
                        ? "bg-primary-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-lg p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <stat.icon className="w-8 h-8 text-primary-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                      <div className="text-gray-600">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Profile Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                    <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors">
                      <Edit className="w-5 h-5" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Full Name</div>
                        <div className="text-gray-900 font-medium">{userInfo.name || "N/A"}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email Address</div>
                        <div className="text-gray-900 font-medium">{userInfo.email || "N/A"}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Phone Number</div>
                        <div className="text-gray-900 font-medium">{userInfo.phone || "N/A"}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Location</div>
                        <div className="text-gray-900 font-medium">{userInfo.location || "N/A"}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Member Since</div>
                        <div className="text-gray-900 font-medium">{userInfo.memberSince || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
                <div className="space-y-4">
                  {recentOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-gray-900">{order.id}</div>
                          <div className="text-sm text-gray-500">{order.date}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          order.status === "Completed" || order.status === "Delivered"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-gray-700 mb-2">{order.item}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">{order.amount}</div>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Events Tab */}
            {activeTab === "events" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
                  <div className="space-y-4">
                    {upcomingEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{event.date}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/events/${event.id}`}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                          >
                            View Event
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Events</h2>
                  <p className="text-gray-600">You haven't attended any events yet.</p>
                </div>
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                    <div className="space-y-3">
                      {[
                        "Email notifications",
                        "SMS notifications",
                        "Event reminders",
                        "Order updates",
                      ].map((pref) => (
                        <label key={pref} className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                          <span className="text-gray-700">{pref}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
                    <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Add Payment Method</div>
                        <div className="text-sm text-gray-500">Securely add a new payment method</div>
                      </div>
                      <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Privacy & Security</h3>
                    <div className="space-y-3">
                      <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-gray-900">Change Password</div>
                        <div className="text-sm text-gray-500">Update your account password</div>
                      </button>
                      <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-gray-900">Privacy Settings</div>
                        <div className="text-sm text-gray-500">Manage your privacy preferences</div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

