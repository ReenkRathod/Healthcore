import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [doctorPending, setDoctorPending] = useState(false);
  const navigate = useNavigate();

  const { login, register, isLoggingIn, isRegistering, loginError, registerError } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: loginEmail, password: loginPassword });
      navigate({ to: "/" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegister = async () => {
    if (regPassword !== regConfirm) {
      alert("Passwords do not match");
      return;
    }
    const [firstName, ...lastNameParts] = regName.split(" ");
    const lastName = lastNameParts.join(" ") || "User";
    
    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName,
        lastName,
        phone: regPhone || undefined,
        role,
        licenseNumber: role === "DOCTOR" ? licenseNumber : undefined,
        certificateUrl: role === "DOCTOR" ? certificateUrl : undefined,
      });

      if (role === "DOCTOR") {
        // Doctors must wait for admin verification — do NOT auto-login
        setDoctorPending(true);
      } else {
        // Patients are approved immediately — auto-login
        await login({ email: regEmail, password: regPassword });
        navigate({ to: "/" });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex items-center justify-center p-md md:p-lg">
      <main className="w-full max-w-[1000px] flex flex-col md:flex-row bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden min-h-[600px]">
        {/* Left Panel: Imagery */}
        <div className="hidden md:flex md:w-1/2 relative bg-surface-container-low flex-col justify-end p-xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBV9Dz9GCkNMpI98DT42BybY2aWR__pBamO1zAyiB9u9FlMwSRI9-nYN0-Do789lLOtOu7EB6o8pzmE7Aq2_rVvezKuBevq3m4cJVAWpuFVWdF0LSr0NmECsNijacUFIojTOmd0tgVPqsT3fcpwiS_RGJ-WLBQ1JLd17jP7Je_EfLHGNGZK-Rw41S2PzLfB7GNYUFgCwnxgWPpJJhzJVXYt8OUe6Ibnb3C6-IUIbP53dFLwKg7Kbs4DJQ')",
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/80 to-transparent"></div>
          <div className="relative z-10 text-on-primary">
            <Link to="/" className="flex items-center gap-sm mb-lg text-on-primary hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                health_and_safety
              </span>
              <span className="font-headline-md text-headline-md font-bold">HealthCore</span>
            </Link>
            <h2 className="font-headline-lg text-headline-lg mb-sm">Your health, securely managed.</h2>
            <p className="font-body-md text-body-md text-on-primary/90">
              Access your medical records, schedule appointments, and connect with your care team through our secure
              patient portal.
            </p>
          </div>
        </div>
        {/* Right Panel: Authentication Forms */}
        <div className="w-full md:w-1/2 p-lg md:p-xl flex flex-col bg-surface-container-lowest">
          {/* Mobile Brand Header */}
          <Link to="/" className="flex md:hidden items-center gap-sm mb-lg text-primary hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              health_and_safety
            </span>
            <span className="font-headline-md text-headline-md font-bold">HealthCore</span>
          </Link>

          {/* Doctor Pending Verification Screen */}
          {doctorPending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-lg">
              <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-secondary-container text-[48px]">pending_actions</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Application Submitted!</h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                  Your doctor registration is <strong>pending admin review</strong>. We will verify your license and certificate. You'll be able to log in once your account is approved.
                </p>
              </div>
              <div className="flex flex-col gap-sm w-full max-w-xs">
                <div className="flex items-center gap-sm p-md bg-surface-container-low rounded-lg border border-outline-variant">
                  <span className="material-symbols-outlined text-secondary text-[20px]">schedule</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Reviews typically take 1–2 business days</span>
                </div>
                <button
                  className="h-[44px] border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                  onClick={() => { setDoctorPending(false); setTab("login"); }}
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* Tab Navigation */}
          <div className="flex border-b border-outline-variant mb-lg" role="tablist">
            <button
              aria-selected={tab === "login"}
              className={`flex-1 pb-sm border-b-2 font-label-md text-label-md transition-colors ${
                tab === "login"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
              id="tab-login"
              role="tab"
              onClick={() => setTab("login")}
            >
              Login
            </button>
            <button
              aria-selected={tab === "register"}
              className={`flex-1 pb-sm border-b-2 font-label-md text-label-md transition-colors ${
                tab === "register"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
              id="tab-register"
              role="tab"
              onClick={() => setTab("register")}
            >
              Register
            </button>
          </div>
          {/* Login Form */}
          {tab === "login" && (
            <div className="flex-1 flex flex-col" id="panel-login" role="tabpanel">
              <div className="mb-lg">
                <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Welcome back</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Please enter your details to access your portal.
                </p>
              </div>
              <form
                className="flex flex-col gap-md flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
              >
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="login-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-md top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">
                      mail
                    </span>
                    <input
                      className="w-full pl-[44px] pr-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="login-email"
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-md top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">
                      lock
                    </span>
                    <input
                      className="w-full pl-[44px] pr-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="login-password"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-xs mb-sm">
                  <label className="flex items-center gap-sm cursor-pointer group">
                    <input
                      className="w-[18px] h-[18px] border-outline-variant rounded text-primary focus:ring-primary focus:ring-offset-2 bg-surface-container-lowest cursor-pointer"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                      Remember me
                    </span>
                  </label>
                  <a
                    className="font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant hover:underline transition-all"
                    href="#"
                  >
                    Forgot Password?
                  </a>
                </div>
                {loginError && (
                  <div className="text-error font-body-sm mb-sm p-sm bg-error/10 rounded-md">
                    {(loginError as any).message || "Failed to sign in. Please try again."}
                  </div>
                )}
                <button
                  className="mt-auto h-[44px] bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-on-primary-fixed-variant transition-colors w-full disabled:opacity-50"
                  type="submit"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Signing In..." : "Sign In"}
                  {!isLoggingIn && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
                
                <div className="flex items-center gap-sm my-xs">
                  <div className="h-px bg-outline-variant flex-1"></div>
                  <span className="text-on-surface-variant font-label-sm text-label-sm uppercase">OR</span>
                  <div className="h-px bg-outline-variant flex-1"></div>
                </div>

                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/google`}
                  className="h-[44px] border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-surface-container-low transition-colors w-full"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-[18px] h-[18px]" />
                  Continue with Google
                </a>
              </form>
            </div>
          )}
          {/* Register Form */}
          {tab === "register" && (
            <div className="flex-1 flex flex-col" id="panel-register" role="tabpanel">
              <div className="mb-lg">
                <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Create an Account</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Register to securely access your medical information.
                </p>
              </div>
              <form
                className="flex flex-col gap-md flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRegister();
                }}
              >
                <div className="flex flex-col gap-xs mb-sm">
                  <label className="font-label-md text-label-md text-on-surface">I am a</label>
                  <div className="flex gap-md">
                    <label className="flex items-center gap-xs cursor-pointer">
                      <input type="radio" name="role" checked={role === "PATIENT"} onChange={() => setRole("PATIENT")} className="text-primary focus:ring-primary h-4 w-4" />
                      <span className="font-body-md text-on-surface">Patient</span>
                    </label>
                    <label className="flex items-center gap-xs cursor-pointer">
                      <input type="radio" name="role" checked={role === "DOCTOR"} onChange={() => setRole("DOCTOR")} className="text-primary focus:ring-primary h-4 w-4" />
                      <span className="font-body-md text-on-surface">Doctor</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-name">
                    Full Name
                  </label>
                  <input
                    className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                    id="reg-name"
                    placeholder="John Doe"
                    required
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-md">
                  <div className="flex flex-col gap-xs flex-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-email">
                      Email Address
                    </label>
                    <input
                      className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="reg-email"
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-xs flex-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-phone">
                      Phone Number
                    </label>
                    <input
                      className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="reg-phone"
                      placeholder="(555) 000-0000"
                      required
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-md">
                  <div className="flex flex-col gap-xs flex-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-password">
                      Password
                    </label>
                    <input
                      className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="reg-password"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-xs flex-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-confirm">
                      Confirm Password
                    </label>
                    <input
                      className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                      id="reg-confirm"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                    />
                  </div>
                </div>
                {role === "DOCTOR" && (
                  <div className="flex flex-col md:flex-row gap-md">
                    <div className="flex flex-col gap-xs flex-1">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-license">
                        License Number
                      </label>
                      <input
                        className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                        id="reg-license"
                        placeholder="MD-123456"
                        required={role === "DOCTOR"}
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-xs flex-1">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="reg-cert">
                        Certificate URL
                      </label>
                      <input
                        className="w-full px-md h-[44px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-container-lowest focus:ring-primary focus:border-transparent transition-all"
                        id="reg-cert"
                        placeholder="https://example.com/certificate.pdf"
                        required={role === "DOCTOR"}
                        type="url"
                        value={certificateUrl}
                        onChange={(e) => setCertificateUrl(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {registerError && (
                  <div className="text-error font-body-sm mb-sm p-sm bg-error/10 rounded-md">
                    {(registerError as any).message || "Failed to create account. Please try again."}
                  </div>
                )}
                <button
                  className="mt-auto md:mt-md h-[44px] bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-on-primary-fixed-variant transition-colors w-full disabled:opacity-50"
                  type="submit"
                  disabled={isRegistering || isLoggingIn}
                >
                  {isRegistering || isLoggingIn ? "Please wait..." : "Complete Registration"}
                </button>
                
                <div className="flex items-center gap-sm my-xs">
                  <div className="h-px bg-outline-variant flex-1"></div>
                  <span className="text-on-surface-variant font-label-sm text-label-sm uppercase">OR</span>
                  <div className="h-px bg-outline-variant flex-1"></div>
                </div>

                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/google`}
                  className="h-[44px] border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-surface-container-low transition-colors w-full"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-[18px] h-[18px]" />
                  Continue with Google
                </a>
              </form>
            </div>
          )}
          {/* Development Test Accounts Section */}
          {import.meta.env.DEV && (
            <div className="mt-lg p-md bg-surface-container-high rounded-xl border border-outline-variant">
              <h3 className="font-label-lg text-label-lg text-on-surface mb-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">bug_report</span>
                Development Test Accounts
              </h3>
              <div className="flex flex-col gap-sm">
                <button
                  className="h-[36px] bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md transition-colors hover:bg-primary-container/80"
                  onClick={() => {
                    setTab("login");
                    setLoginEmail("patient.test@example.com");
                    setLoginPassword("PatientTest@12345");
                  }}
                >
                  Load Patient Credentials
                </button>
                <button
                  className="h-[36px] bg-secondary-container text-on-secondary-container rounded-lg font-label-md text-label-md transition-colors hover:bg-secondary-container/80"
                  onClick={() => {
                    setTab("login");
                    setLoginEmail("doctor.test@example.com");
                    setLoginPassword("DoctorTest@12345");
                  }}
                >
                  Load Doctor Credentials (Login)
                </button>
                <button
                  className="h-[36px] bg-tertiary-container text-on-tertiary-container rounded-lg font-label-md text-label-md transition-colors hover:bg-tertiary-container/80"
                  onClick={() => {
                    setTab("login");
                    setLoginEmail("admin.test@example.com");
                    setLoginPassword("AdminTest@12345");
                  }}
                >
                  Load Admin Credentials (Login)
                </button>
                <div className="h-px bg-outline-variant my-xs" />
                <button
                  className="h-[36px] bg-primary text-on-primary rounded-lg font-label-md text-label-md transition-colors hover:opacity-90"
                  onClick={() => {
                    setDoctorPending(false);
                    setTab("register");
                    setRole("DOCTOR");
                    const rand = Math.floor(Math.random() * 8999) + 1000;
                    setRegName(`Dr. Jane Smith ${rand}`);
                    setRegEmail(`doctor.new${rand}@example.com`);
                    setRegPhone("(555) 234-5678");
                    setRegPassword("DoctorPass@12345");
                    setRegConfirm("DoctorPass@12345");
                    setLicenseNumber(`MD-${rand}`);
                    setCertificateUrl(`https://example.com/certificates/doctor-${rand}.pdf`);
                  }}
                >
                  Fill New Doctor Registration (Unique Email)
                </button>
                <button
                  className="h-[36px] bg-surface-container-low border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md transition-colors hover:bg-surface-container"
                  onClick={() => {
                    setDoctorPending(false);
                    setTab("register");
                    setRole("PATIENT");
                    const rand = Math.floor(Math.random() * 8999) + 1000;
                    setRegName(`John Patient ${rand}`);
                    setRegEmail(`patient.new${rand}@example.com`);
                    setRegPhone("(555) 876-5432");
                    setRegPassword("PatientPass@12345");
                    setRegConfirm("PatientPass@12345");
                  }}
                >
                  Fill New Patient Registration (Unique Email)
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Register - HealthCore Patient Portal" },
      {
        name: "description",
        content: "Securely log in or create an account to access your HealthCore patient portal.",
      },
      { property: "og:title", content: "Sign In or Register - HealthCore Patient Portal" },
      {
        property: "og:description",
        content: "Securely log in or create an account to access your HealthCore patient portal.",
      },
    ],
  }),
  component: AuthPage,
});
