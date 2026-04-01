import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";
import ThemeToggle from "../components/ThemeToggle";

const heroImageUrl = "/login.jpg";

const inputClasses =
  "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder-white/40 transition focus:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-500/20";
const labelClasses =
  "text-xs font-semibold uppercase tracking-[0.35em] text-white/60";

const AuthPage = () => {
  const nav = useNavigate();
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState("faculty");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    universityId: "",
    companyName: "",
  });
  const [taxCardFile, setTaxCardFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength)
      return "Password must be at least 8 characters long";
    if (!hasUpperCase || !hasLowerCase)
      return "Password must contain both uppercase and lowercase letters";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecialChar)
      return "Password must contain at least one special character";
    return "";
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "Please enter a valid email address";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsError(false);
    const newErrors = {};

    if (!isLogin) {
      if (userType === "faculty") {
        if (!formData.firstName.trim())
          newErrors.firstName = "First name is required";
        if (!formData.lastName.trim())
          newErrors.lastName = "Last name is required";
        if (!formData.universityId.trim())
          newErrors.universityId = "University ID is required";
      } else if (userType === "vendor") {
        if (!formData.companyName.trim())
          newErrors.companyName = "Company name is required";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSubmitMessage("Login successful!");
        setIsError(false);
        setTimeout(() => setSubmitMessage(""), 2500);
        nav("/dashboard", { replace: true });
      } else {
        if (userType === "faculty") {
          await register({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            UniId: formData.universityId,
          });
          setSubmitMessage(
            "Account created! Please check your email to verify."
          );
        } else if (userType === "vendor") {
          const fd = new FormData();
          fd.append("companyName", formData.companyName);
          fd.append("email", formData.email);
          fd.append("password", formData.password);
          if (taxCardFile) fd.append("taxCard", taxCardFile);
          if (logoFile) fd.append("logo", logoFile);

          await api.post("/auth/vendor-signup", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          setSubmitMessage(
            "Vendor account created! Please check your email to verify."
          );
        }

        setTimeout(() => setSubmitMessage(""), 4000);
        nav("/login", { replace: true });
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (isLogin
          ? "Login failed. Please check your credentials."
          : "Signup failed. Please try again.");
      setIsError(true);
      setSubmitMessage(message);
      setTimeout(() => setSubmitMessage(""), 5000);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      universityId: "",
      companyName: "",
    });
    setErrors({});
    setSubmitMessage("");
    setIsError(false);
  };

  const containerClasses = isLogin
    ? "relative flex min-h-screen w-full flex-col overflow-hidden bg-slate-950 text-white md:flex-row"
    : "relative flex min-h-screen w-screen flex-col items-center justify-center bg-slate-950 text-white px-4 py-8";

  return (
    <div className={containerClasses}>
      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={() => nav("/")}
        className="group absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white auth-back-home shadow-lg backdrop-blur transition hover:border-white/30 hover:bg-white/20"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Home
      </button>

      {isLogin && (
        <div className="auth-hero relative flex flex-1 items-center justify-center overflow-hidden px-8 py-24 md:order-1">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(120deg, rgba(3, 7, 18, 0.85), rgba(2, 6, 23, 0.55)), url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10 max-w-xl space-y-6 text-center md:text-left">
            <p className="text-sm uppercase tracking-[0.7em] text-white/60">
              GUC Campus Portal
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-white drop-shadow-lg lg:text-5xl">
              Manage every event, booking, and vendor from one place.
            </h2>
            <p className="text-base text-white/80 lg:text-lg">
              Centralize approvals, organize booths, and join faculty or vendor
              experiences with a seamless digital workflow.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-left md:justify-start">
              <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4">
                <p className="text-3xl font-semibold text-white">140+</p>
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">
                  Annual Events
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4">
                <p className="text-3xl font-semibold text-white">12k+</p>
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">
                  Active Members
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Section */}
      <div
        className={`${
          isLogin
            ? "flex flex-1 items-center justify-center px-6 py-8 sm:px-10 md:order-2 md:w-1/2"
            : "flex w-full items-center justify-center md:order-2"
        }`}
      >
        <div
          className={`w-full ${
            isLogin ? "max-w-md space-y-8" : "max-w-5xl space-y-6"
          }`}
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-orange-200/80">
              {isLogin ? "Sign in" : "Create account"}
            </p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              {isLogin ? "Welcome back" : "Join the GUC experience"}
            </h1>
            <p className="text-sm text-white/70">
              {isLogin
                ? "Access real-time schedules, approvals, and resource management."
                : "Choose your path below and unlock campus logistics in seconds."}
            </p>
          </div>

          {submitMessage && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                isError
                  ? "border-red-400/60 bg-red-500/10 text-red-200"
                  : "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              {submitMessage}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/60">
                Sign up as
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "faculty",
                    title: "GUCian",
                    hint: "Students & Faculty",
                  },
                  { id: "vendor", title: "Vendor", hint: "Brands & Booths" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setUserType(option.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      userType === option.id
                        ? "border-orange-400 bg-orange-500/10 text-white"
                        : "border-white/10 text-white/70 hover:border-white/40"
                    }`}
                  >
                    <p className="text-lg font-semibold">{option.title}</p>
                    <p className="text-xs text-white/60">{option.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className={
              isLogin ? "space-y-6" : "grid grid-cols-1 gap-4 lg:grid-cols-12"
            }
            onSubmit={handleSubmit}
          >
            {!isLogin && userType === "faculty" && (
              <>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses} htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={inputClasses}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-300">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses} htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={inputClasses}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-300">{errors.lastName}</p>
                  )}
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses} htmlFor="universityId">
                    University ID
                  </label>
                  <input
                    id="universityId"
                    name="universityId"
                    placeholder="20XX-XXXXX"
                    value={formData.universityId}
                    onChange={handleInputChange}
                    className={inputClasses}
                  />
                  {errors.universityId && (
                    <p className="text-sm text-red-300">
                      {errors.universityId}
                    </p>
                  )}
                </div>
              </>
            )}

            {!isLogin && userType === "vendor" && (
              <>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses} htmlFor="companyName">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={inputClasses}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-300">{errors.companyName}</p>
                  )}
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses}>
                    Attach Tax Card (PDF/image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="block w-full cursor-pointer rounded-xl border border-dashed border-white/20 bg-transparent px-4 py-3 text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-white/40"
                    onChange={(e) =>
                      setTaxCardFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className={labelClasses}>Attach Logo (image)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer rounded-xl border border-dashed border-white/20 bg-transparent px-4 py-3 text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-white/40"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>
            )}

            <div className={isLogin ? "space-y-2" : "space-y-2 lg:col-span-6"}>
              <label className={labelClasses} htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder={
                  !isLogin && userType === "vendor"
                    ? "company@example.com"
                    : "john.doe@student.guc.edu.eg"
                }
                value={formData.email}
                onChange={handleInputChange}
                className={inputClasses}
              />
              {errors.email && (
                <p className="text-sm text-red-300">{errors.email}</p>
              )}
            </div>

            <div className={isLogin ? "space-y-2" : "space-y-2 lg:col-span-6"}>
              <label className={labelClasses} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className={inputClasses}
              />
              {errors.password ? (
                <p className="text-sm text-red-300">{errors.password}</p>
              ) : (
                !isLogin && (
                  <p className="text-sm text-white/60">
                    Must include uppercase, lowercase, numbers, and symbols.
                  </p>
                )
              )}
            </div>

            <div className={isLogin ? "" : "lg:col-span-12"}>
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 px-6 py-3 text-lg font-semibold tracking-wide text-white shadow-xl shadow-orange-900/40 transition hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/40"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/70">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={toggleForm}
              className="font-semibold text-orange-300 transition hover:text-orange-200"
            >
              {isLogin ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
