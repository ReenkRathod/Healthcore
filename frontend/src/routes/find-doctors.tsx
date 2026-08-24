import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

const specialties = [
  "All Specialties",
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Orthopedics",
];

import { usePublicDoctors } from "../hooks/useDoctors";

function FindDoctors() {
  const [activeSpecialty, setActiveSpecialty] = useState("All Specialties");
  const [searchTerm, setSearchTerm] = useState("");

  const queryFilters: { search?: string; specialisation?: string } = {};
  if (searchTerm) queryFilters.search = searchTerm;
  if (activeSpecialty !== "All Specialties") queryFilters.specialisation = activeSpecialty;

  const { data: doctors = [], isLoading, error } = usePublicDoctors(queryFilters);

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen font-body-md text-body-md flex flex-col">
      {/* TopNavBar (From JSON) */}
      <nav className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest border-b border-outline-variant z-50">
        <div className="flex items-center gap-md">
          <span className="text-headline-md font-headline-md font-bold text-primary">HealthCore</span>
          {/* Global Search (search_bar: "on_left") */}
          <div className="hidden md:flex items-center bg-surface-container-low rounded-full px-md h-10 border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ml-lg w-64 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant mr-sm text-[20px]">search</span>
            <input className="bg-transparent border-none focus:ring-0 w-full text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search global..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-sm text-on-surface-variant">
          <button aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button aria-label="Help" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant ml-sm cursor-pointer">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU58eyjoh4GPqnS2mPhcgbZ4VXMOIODOfTNglNyEJxW16awPPCTBs09kVN1hWO1yXiU6Cf-YiACBHZ9U9mHUh5YINHRQLNH9bW7oowQcjWxicgjEy2jciifh2nHajNMveyDDgyP2TuSq_4gbOQ235IXHNb1Yrek1pFpkeE5fPhfeRcDtU02NxUMDEr98CdTunAWBxVvsZcbUJMJC5ZvGrP9311-WYDA_T8tJhmycN3rTa_0OT9A1DUNw"
            />
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-lg py-xl flex flex-col gap-xl">
        {/* Page Header */}
        <section className="flex flex-col gap-sm">
          <h1 className="font-display-lg text-display-lg text-on-surface">Find a Doctor</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">Search for specialists, general practitioners, and care teams based on your medical needs and availability.</p>
        </section>
        {/* Search & Filter Console (Bento Style) */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md md:p-lg flex flex-col gap-lg shadow-sm">
          {/* Primary Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-md items-end">
            <div className="md:col-span-5 flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="doctor-name">Doctor Name or Clinic</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-md text-on-surface-variant">person_search</span>
                <input 
                  className="w-full h-[48px] pl-[48px] pr-md rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md font-body-md transition-all" 
                  id="doctor-name" 
                  placeholder="e.g., Dr. Smith, Cardiology Clinic" 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="availability-date">Availability Date</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-md text-on-surface-variant">calendar_today</span>
                <input className="w-full h-[48px] pl-[48px] pr-md rounded-lg border border-outline-variant bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md font-body-md text-on-surface transition-all" id="availability-date" type="date" />
              </div>
            </div>
            <div className="md:col-span-3">
              <button className="w-full h-[48px] bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-sm">
                <span className="material-symbols-outlined text-[20px]">search</span>
                Search Providers
              </button>
            </div>
          </div>
          {/* Specialty Filters */}
          <div className="flex flex-col gap-sm border-t border-outline-variant pt-lg mt-sm">
            <h3 className="font-label-md text-label-md text-on-surface-variant">Specializations</h3>
            <div className="flex flex-wrap gap-sm">
              {specialties.map((specialty) => (
                <button
                  key={specialty}
                  onClick={() => setActiveSpecialty(specialty)}
                  className={
                    activeSpecialty === specialty
                      ? "px-md py-sm rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md border border-primary-container transition-colors"
                      : "px-md py-sm rounded-full bg-surface-bright text-on-surface font-label-md text-label-md border border-outline-variant hover:bg-surface-container transition-colors"
                  }
                >
                  {specialty}
                </button>
              ))}
              <button className="px-md py-sm rounded-full bg-surface-bright text-on-surface font-label-md text-label-md border border-outline-variant hover:bg-surface-container transition-colors flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                More Filters
              </button>
            </div>
          </div>
        </section>
        {/* Results Header */}
        <div className="flex justify-between items-center mt-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">Available Doctors ({doctors.length})</h2>
          <div className="flex items-center gap-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Sort by:</span>
            <select className="border border-outline-variant rounded-md bg-surface-bright px-sm py-[6px] font-body-sm text-body-sm text-on-surface focus:ring-primary focus:border-primary outline-none">
              <option>Earliest Available</option>
              <option>Highest Rated</option>
              <option>Distance</option>
            </select>
          </div>
        </div>
        {/* Doctor Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {isLoading && <div className="col-span-full text-center py-xl text-on-surface-variant font-body-lg">Loading doctors...</div>}
          {error && <div className="col-span-full text-center py-xl text-error font-body-lg">Error loading doctors.</div>}
          {!isLoading && !error && doctors.length === 0 && (
            <div className="col-span-full text-center py-xl text-on-surface-variant font-body-lg">No doctors found matching your criteria.</div>
          )}
          {!isLoading && !error && doctors.map((doctor) => (
            <div key={doctor.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col gap-md transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div className="flex items-start gap-md">
                {doctor.avatarUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-outline-variant">
                    <img alt={`${doctor.firstName} ${doctor.lastName}`} className="w-full h-full object-cover" src={doctor.avatarUrl} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-outline-variant flex items-center justify-center bg-surface-container-high">
                    <span className="material-symbols-outlined text-[32px] text-tertiary-container">person</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <h3 className="font-headline-sm text-headline-md font-semibold text-on-surface">{doctor.title ? `${doctor.title} ` : ''}{doctor.firstName} {doctor.lastName}</h3>
                  <span className="font-body-sm text-body-sm text-secondary">
                    {doctor.specialisations?.[0]?.name || "General"}
                  </span>
                  <div className="flex items-center gap-xs mt-xs text-secondary-fixed-dim">
                    <span className="material-symbols-outlined text-[16px] text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-md text-label-md text-on-surface">New</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">(0 reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-xs pt-sm border-t border-outline-variant mt-sm">
                <div className="flex items-center gap-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  <span className="font-body-sm text-body-sm">Online / Telehealth</span>
                </div>
                <div className="flex items-center gap-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  <span className="font-body-sm text-body-sm font-medium text-primary">Accepting Appointments</span>
                </div>
              </div>
              <Link
                to="/doctors/$doctorId"
                params={{ doctorId: doctor.id }}
                className="mt-auto w-full h-[40px] bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-colors border border-transparent flex items-center justify-center"
              >
                View Availability
              </Link>
            </div>
          ))}
        </section>
        {/* Pagination (Simple) */}
        <div className="flex justify-center mt-lg mb-xl">
          <button className="px-lg py-sm rounded-full border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors">
            Load More Doctors
          </button>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/find-doctors")({
  head: () => ({
    meta: [
      { title: "Find Doctors - HealthCore" },
      { name: "description", content: "Search specialists and general practitioners by specialty, location, and availability." },
      { property: "og:title", content: "Find Doctors - HealthCore" },
      { property: "og:description", content: "Search specialists and general practitioners by specialty, location, and availability." },
    ],
  }),
  component: FindDoctors,
});
