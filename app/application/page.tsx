"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  User,
  FileText,
  Briefcase,
  CheckCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  Send,
} from "lucide-react";
import Link from "next/link";

interface PersonalDetails {
  firstName: string;
  secondName: string;
  email: string;
  phone: string;
  idNumber: string;
  gender: string;
  age: string;
  county: string;
  passport: string;
}

interface Documents {
  passportPhoto: File | null;
  idFront: File | null;
  idBack: File | null;
  certificateOfGoodConduct: File | null;
}

interface JobSelection {
  cv: File | null;
  jobPosition: string;
}

export default function ApplicationPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [currentStage, setCurrentStage] = useState(1);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
    firstName: "",
    secondName: "",
    email: user?.email || "",
    phone: "",
    idNumber: "",
    gender: "",
    age: "",
    county: "",
    passport: "",
  });
  const [documents, setDocuments] = useState<Documents>({
    passportPhoto: null,
    idFront: null,
    idBack: null,
    certificateOfGoodConduct: null,
  });
  const [jobSelection, setJobSelection] = useState<JobSelection>({
    cv: null,
    jobPosition: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // File refs
  const passportPhotoRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const certificateRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (loading) return;
    
    if (!isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated && user && !user.emailVerified) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
    }
  }, [isAuthenticated, user, router, loading]);

  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const savedData = localStorage.getItem(`application_${user.id}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setPersonalDetails(parsed.personalDetails || personalDetails);
        // Note: Files can't be stored in localStorage, so we only restore form data
      }
    }
  }, [user]);

  // Save data to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const dataToSave = {
        personalDetails,
        jobSelection: {
          ...jobSelection,
          cv: null, // Can't save file to localStorage
        },
      };
      localStorage.setItem(`application_${user.id}`, JSON.stringify(dataToSave));
    }
  }, [personalDetails, jobSelection, user]);

  const handleFileChange = (
    field: keyof Documents | "cv",
    file: File | null
  ) => {
    if (field === "cv") {
      setJobSelection({ ...jobSelection, cv: file });
    } else {
      setDocuments({ ...documents, [field]: file });
    }
  };

  const handleSubmit = () => {
    // Format application data for WhatsApp
    const whatsappMessage = `*Job Application Submission*

*Personal Details:*
First Name: ${personalDetails.firstName}
Second Name: ${personalDetails.secondName}
Email: ${personalDetails.email}
Phone: ${personalDetails.phone}
ID Number: ${personalDetails.idNumber}
Gender: ${personalDetails.gender}
Age: ${personalDetails.age}
County: ${personalDetails.county}
Passport: ${personalDetails.passport || "Not provided"}

*Job Selection:*
Position: ${jobSelection.jobPosition}
CV: ${jobSelection.cv ? jobSelection.cv.name : "Not uploaded"}

*Documents:*
Passport Photo: ${documents.passportPhoto ? documents.passportPhoto.name : "Not uploaded"}
ID Front: ${documents.idFront ? documents.idFront.name : "Not uploaded"}
ID Back: ${documents.idBack ? documents.idBack.name : "Not uploaded"}
Certificate of Good Conduct: ${documents.certificateOfGoodConduct ? documents.certificateOfGoodConduct.name : "Not uploaded"}

---
*Note: Please attach all document files to this WhatsApp message.*`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/254755933829?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    setSubmitted(true);

    // Clear saved data after submission
    if (user) {
      localStorage.removeItem(`application_${user.id}`);
    }
  };

  const stages = [
    {
      id: 1,
      title: "Personal Details",
      icon: User,
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={personalDetails.firstName}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    firstName: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Name *
              </label>
              <input
                type="text"
                required
                value={personalDetails.secondName}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    secondName: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your second name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={personalDetails.email}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    email: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={personalDetails.phone}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    phone: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+254 700 000 000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Number *
              </label>
              <input
                type="text"
                required
                value={personalDetails.idNumber}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    idNumber: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your ID number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                required
                value={personalDetails.gender}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    gender: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age *
              </label>
              <input
                type="number"
                required
                min="18"
                value={personalDetails.age}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    age: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your age"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County *
              </label>
              <input
                type="text"
                required
                value={personalDetails.county}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    county: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your county"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Number (Optional)
            </label>
            <input
              type="text"
              value={personalDetails.passport}
              onChange={(e) =>
                setPersonalDetails({
                  ...personalDetails,
                  passport: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter passport number if available"
            />
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Upload Documents",
      icon: FileText,
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Photo (Optional)
            </label>
            <label
              htmlFor="passport-photo"
              className="cursor-pointer block"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="text-primary-600 font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG (MAX. 5MB)
                </p>
                {documents.passportPhoto && (
                  <p className="text-sm text-primary-600 mt-2 font-semibold">
                    {documents.passportPhoto.name}
                  </p>
                )}
              </div>
              <input
                type="file"
                id="passport-photo"
                accept="image/*"
                className="hidden"
                ref={passportPhotoRef}
                onChange={(e) =>
                  handleFileChange(
                    "passportPhoto",
                    e.target.files?.[0] || null
                  )
                }
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Photo (Front) *
            </label>
            <label htmlFor="id-front" className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="text-primary-600 font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG (MAX. 5MB)
                </p>
                {documents.idFront && (
                  <p className="text-sm text-primary-600 mt-2 font-semibold">
                    {documents.idFront.name}
                  </p>
                )}
              </div>
              <input
                type="file"
                id="id-front"
                accept="image/*"
                required
                className="hidden"
                ref={idFrontRef}
                onChange={(e) =>
                  handleFileChange("idFront", e.target.files?.[0] || null)
                }
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Photo (Back) *
            </label>
            <label htmlFor="id-back" className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="text-primary-600 font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG (MAX. 5MB)
                </p>
                {documents.idBack && (
                  <p className="text-sm text-primary-600 mt-2 font-semibold">
                    {documents.idBack.name}
                  </p>
                )}
              </div>
              <input
                type="file"
                id="id-back"
                accept="image/*"
                required
                className="hidden"
                ref={idBackRef}
                onChange={(e) =>
                  handleFileChange("idBack", e.target.files?.[0] || null)
                }
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate of Good Conduct *
            </label>
            <label htmlFor="certificate" className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="text-primary-600 font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG (MAX. 5MB)
                </p>
                {documents.certificateOfGoodConduct && (
                  <p className="text-sm text-primary-600 mt-2 font-semibold">
                    {documents.certificateOfGoodConduct.name}
                  </p>
                )}
              </div>
              <input
                type="file"
                id="certificate"
                accept=".pdf,image/*"
                required
                className="hidden"
                ref={certificateRef}
                onChange={(e) =>
                  handleFileChange(
                    "certificateOfGoodConduct",
                    e.target.files?.[0] || null
                  )
                }
              />
            </label>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Job Selection",
      icon: Briefcase,
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CV/Resume *
            </label>
            <label htmlFor="cv" className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="text-primary-600 font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX (MAX. 5MB)
                </p>
                {jobSelection.cv && (
                  <p className="text-sm text-primary-600 mt-2 font-semibold">
                    {jobSelection.cv.name}
                  </p>
                )}
              </div>
              <input
                type="file"
                id="cv"
                accept=".pdf,.doc,.docx"
                required
                className="hidden"
                ref={cvRef}
                onChange={(e) =>
                  handleFileChange("cv", e.target.files?.[0] || null)
                }
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Position *
            </label>
            <input
              type="text"
              required
              value={jobSelection.jobPosition}
              onChange={(e) =>
                setJobSelection({
                  ...jobSelection,
                  jobPosition: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Marketing Manager, Event Coordinator"
            />
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: "Application Summary",
      icon: CheckCircle,
      component: (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">First Name:</span>
                <p className="text-gray-900">{personalDetails.firstName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Second Name:</span>
                <p className="text-gray-900">{personalDetails.secondName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <p className="text-gray-900">{personalDetails.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <p className="text-gray-900">{personalDetails.phone}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID Number:</span>
                <p className="text-gray-900">{personalDetails.idNumber}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Gender:</span>
                <p className="text-gray-900">{personalDetails.gender}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Age:</span>
                <p className="text-gray-900">{personalDetails.age}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">County:</span>
                <p className="text-gray-900">{personalDetails.county}</p>
              </div>
              {personalDetails.passport && (
                <div>
                  <span className="font-medium text-gray-700">Passport:</span>
                  <p className="text-gray-900">{personalDetails.passport}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Documents
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">
                  Passport Photo:
                </span>
                <p className="text-gray-900">
                  {documents.passportPhoto
                    ? documents.passportPhoto.name
                    : "Not uploaded"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID Front:</span>
                <p className="text-gray-900">
                  {documents.idFront ? documents.idFront.name : "Not uploaded"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID Back:</span>
                <p className="text-gray-900">
                  {documents.idBack ? documents.idBack.name : "Not uploaded"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Certificate of Good Conduct:
                </span>
                <p className="text-gray-900">
                  {documents.certificateOfGoodConduct
                    ? documents.certificateOfGoodConduct.name
                    : "Not uploaded"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Job Selection
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Position:</span>
                <p className="text-gray-900">{jobSelection.jobPosition}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">CV:</span>
                <p className="text-gray-900">
                  {jobSelection.cv ? jobSelection.cv.name : "Not uploaded"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> After clicking "Submit Application", you
              will be redirected to WhatsApp. Please attach all document files
              (passport photo, ID photos, certificate, and CV) to the WhatsApp
              message.
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  if (submitted) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Your application has been sent to WhatsApp. Please attach all
            document files in the WhatsApp chat.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center">
            Return to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentStageData = stages[currentStage - 1];
  const canProceed = () => {
    if (currentStage === 1) {
      return (
        personalDetails.firstName &&
        personalDetails.secondName &&
        personalDetails.email &&
        personalDetails.phone &&
        personalDetails.idNumber &&
        personalDetails.gender &&
        personalDetails.age &&
        personalDetails.county
      );
    }
    if (currentStage === 2) {
      return (
        documents.idFront && documents.idBack && documents.certificateOfGoodConduct
      );
    }
    if (currentStage === 3) {
      return jobSelection.cv && jobSelection.jobPosition;
    }
    return true;
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Job Application
            </h1>
            <p className="text-gray-600">
              Complete all 4 stages to submit your application
            </p>
          </motion.div>

          {/* Email Verification Notice */}
          {showVerificationNotice && user && !user.emailVerified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <X className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-yellow-700">
                    <strong>Email Verification Required:</strong> Please verify your email address to complete your account setup. 
                    A verification code has been sent to <strong>{user.email}</strong>. 
                    <Link href={`/verify-email?email=${encodeURIComponent(user.email)}`} className="ml-1 text-yellow-800 underline font-semibold">
                      Verify now
                    </Link>
                  </p>
                </div>
                <button
                  onClick={() => setShowVerificationNotice(false)}
                  className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = currentStage === stage.id;
                const isCompleted = currentStage > stage.id;
                return (
                  <div key={stage.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                          isActive
                            ? "bg-primary-600 border-primary-600 text-white"
                            : isCompleted
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-white border-gray-300 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-xs font-medium text-center ${
                          isActive
                            ? "text-primary-600"
                            : isCompleted
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {stage.title}
                      </p>
                    </div>
                    {index < stages.length - 1 && (
                      <div
                        className={`h-1 flex-1 mx-2 ${
                          isCompleted ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Content */}
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                <currentStageData.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Stage {currentStage}: {currentStageData.title}
                </h2>
                <p className="text-gray-600 text-sm">
                  {currentStage === 1 && "Enter your personal information"}
                  {currentStage === 2 && "Upload required documents"}
                  {currentStage === 3 && "Select job position and upload CV"}
                  {currentStage === 4 && "Review and confirm your application"}
                </p>
              </div>
            </div>

            <div className="mt-6">{currentStageData.component}</div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setCurrentStage(Math.max(1, currentStage - 1))}
                disabled={currentStage === 1}
                className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                  currentStage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Previous
              </button>

              {currentStage < stages.length ? (
                <button
                  onClick={() => setCurrentStage(currentStage + 1)}
                  disabled={!canProceed()}
                  className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                    canProceed()
                      ? "btn-primary"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Next
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="btn-primary inline-flex items-center"
                >
                  Submit Application
                  <Send className="w-5 h-5 ml-2" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

