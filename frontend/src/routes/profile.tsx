import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | HealthCore" },
      { name: "description", content: "View and manage your HealthCore profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-on-surface-variant font-body-md">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-md">
        <p className="text-error font-body-md">You are not logged in.</p>
        <Link to="/auth" className="text-primary font-bold hover:underline">Go to Login</Link>
      </div>
    );
  }

  const isDoctor = user.role === "DOCTOR";
  const doctorVerified = isDoctor ? user.doctorProfile?.isVerifiedByAdmin : undefined;

  return (
    <div className="bg-background min-h-screen font-body-md antialiased text-on-surface">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md">
        <div className="max-w-[800px] mx-auto flex items-center gap-md">
          <Link to="/" className="text-secondary hover:text-on-surface transition-colors flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-margin-mobile md:px-lg py-xl flex flex-col gap-lg">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-xs">My Profile</h1>
          <p className="text-body-md font-body-md text-secondary">Manage your personal information and account settings.</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-lg shadow-sm">
          <div className="flex items-center gap-lg border-b border-outline-variant pb-lg">
            <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px]">person</span>
            </div>
            <div>
              <h2 className="text-headline-md font-headline-md text-on-surface">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-body-md text-secondary mt-xs flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">email</span>
                {user.email}
              </p>
              <div className="mt-sm flex gap-sm">
                <span className="inline-flex items-center px-sm py-xs rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider">
                  {user.role}
                </span>
                {isDoctor && (
                  doctorVerified ? (
                    <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-[#198754]/10 text-[#198754] text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      Verified Provider
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-[#FFB300]/10 text-[#FFB300] text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                      Pending Verification
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {isDoctor && !doctorVerified && (
            <div className="bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-lg p-md flex items-start gap-md">
              <span className="material-symbols-outlined text-[#FFB300] mt-xs">info</span>
              <div>
                <h3 className="text-label-md font-bold text-[#b37d00] mb-xs">Account Pending Verification</h3>
                <p className="text-body-sm text-[#b37d00]">
                  Your doctor profile is currently under review by our administration team. You will not appear in patient searches and cannot accept new appointments until your account is verified.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div>
              <label className="text-label-md font-label-md text-on-surface mb-xs block">First Name</label>
              <div className="px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface">
                {user.firstName}
              </div>
            </div>
            <div>
              <label className="text-label-md font-label-md text-on-surface mb-xs block">Last Name</label>
              <div className="px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface">
                {user.lastName}
              </div>
            </div>
            <div>
              <label className="text-label-md font-label-md text-on-surface mb-xs block">Email Address</label>
              <div className="px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface opacity-70">
                {user.email}
              </div>
            </div>
            <div>
              <label className="text-label-md font-label-md text-on-surface mb-xs block">Phone Number</label>
              <div className="px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface">
                {user.phone || <span className="text-outline italic">Not provided</span>}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-md border-t border-outline-variant">
            <button disabled className="px-lg py-sm bg-primary text-on-primary rounded-lg text-label-md font-label-md opacity-50 cursor-not-allowed">
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
