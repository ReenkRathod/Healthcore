import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { usePublicDoctors } from "../hooks/useDoctors";

const specialties = [
  "All Specialties",
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Orthopedics",
];

const FEE_PRESETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50 – $100", min: 50, max: 100 },
  { label: "$100 – $200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: Infinity },
];

export default function FindDoctors() {
  const [activeSpecialty, setActiveSpecialty] = useState("All Specialties");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("earliest");
  const [feePreset, setFeePreset] = useState("Any");
  const [maxFeeSlider, setMaxFeeSlider] = useState(500);

  const queryFilters: { search?: string; specialisation?: string } = {};
  if (searchTerm) queryFilters.search = searchTerm;
  if (activeSpecialty !== "All Specialties") queryFilters.specialisation = activeSpecialty;

  const { data: doctors = [], isLoading, error } = usePublicDoctors(queryFilters);

  const activeFeePreset = FEE_PRESETS.find((p) => p.label === feePreset) ?? FEE_PRESETS[0];

  const processedDoctors = useMemo(() => {
    let list = [...doctors];

    // Fee range filter
    if (feePreset === "Any") {
      list = list.filter((d) => (d.consultationFee ?? 50) <= maxFeeSlider);
    } else {
      list = list.filter(
        (d) =>
          (d.consultationFee ?? 50) >= activeFeePreset.min &&
          (d.consultationFee ?? 50) <= activeFeePreset.max
      );
    }

    // Sorting
    if (sortOrder === "fee-asc") {
      list.sort((a, b) => (a.consultationFee ?? 50) - (b.consultationFee ?? 50));
    } else if (sortOrder === "fee-desc") {
      list.sort((a, b) => (b.consultationFee ?? 50) - (a.consultationFee ?? 50));
    }

    return list;
  }, [doctors, sortOrder, feePreset, maxFeeSlider, activeFeePreset]);

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen font-body-md text-body-md flex flex-col">
      {/* TopNavBar (From JSON) */}
      <nav className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest border-b border-outline-variant z-50">
        <div className="flex items-center gap-md">
          <Link to="/" className="text-headline-md font-headline-md font-bold text-primary hover:opacity-80 transition-opacity">HealthCore</Link>
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
            </div>
          </div>

          {/* Consultation Fee Filter */}
          <div className="flex flex-col gap-md border-t border-outline-variant pt-lg mt-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant">Consultation Fee</h3>
              </div>
              {feePreset === "Any" && (
                <span className="font-label-sm text-label-sm text-on-primary-container bg-primary-container px-2 py-0.5 rounded-md">
                  Up to {maxFeeSlider >= 500 ? "$500+" : `$${maxFeeSlider}`}
                </span>
              )}
            </div>

            {/* Quick fee presets */}
            <div className="flex flex-wrap gap-sm">
              {FEE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  id={`fee-preset-${preset.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                  onClick={() => setFeePreset(preset.label)}
                  className={
                    feePreset === preset.label
                      ? "px-md py-sm rounded-full bg-primary text-on-primary font-label-md text-label-md border border-primary transition-all shadow-sm"
                      : "px-md py-sm rounded-full bg-surface-bright text-on-surface font-label-md text-label-md border border-outline-variant hover:bg-primary-fixed hover:border-primary transition-all"
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Range slider — shown when "Any" is selected */}
            {feePreset === "Any" && (
              <div className="flex flex-col gap-xs mt-xs">
                <div className="flex items-center gap-md">
                  <span className="font-body-sm text-body-sm text-on-surface-variant w-8">$0</span>
                  <div className="relative flex-1 flex items-center h-6">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                      <div className="w-full h-1.5 bg-outline-variant rounded-full" />
                      <div
                        className="absolute h-1.5 bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min((maxFeeSlider / 500) * 100, 100)}%` }}
                      />
                    </div>
                    <input
                      id="fee-range-slider"
                      type="range"
                      min={0}
                      max={500}
                      step={10}
                      value={maxFeeSlider}
                      onChange={(e) => setMaxFeeSlider(Number(e.target.value))}
                      className="relative w-full cursor-pointer"
                      style={{ WebkitAppearance: "auto", appearance: "auto" }}
                    />
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant w-14 text-right">
                    {maxFeeSlider >= 500 ? "$500+" : `$${maxFeeSlider}`}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                  Drag to set your maximum consultation fee
                </p>
              </div>
            )}
          </div>
        </section>
        {/* Results Header */}
        <div className="flex justify-between items-center mt-md">
          <div className="flex items-baseline gap-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface">Available Doctors</h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">({processedDoctors.length} shown)</span>
          </div>
          <div className="flex items-center gap-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Sort by:</span>
            <select
              id="doctor-sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-outline-variant rounded-md bg-surface-bright px-sm py-[6px] font-body-sm text-body-sm text-on-surface focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="earliest">Earliest Available</option>
              <option value="fee-asc">Fee: Low to High</option>
              <option value="fee-desc">Fee: High to Low</option>
            </select>
          </div>
        </div>
        {/* Doctor Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {isLoading && <div className="col-span-full text-center py-xl text-on-surface-variant font-body-lg">Loading doctors...</div>}
          {error && <div className="col-span-full text-center py-xl text-error font-body-lg">Error loading doctors.</div>}
          {!isLoading && !error && processedDoctors.length === 0 && (
            <div className="col-span-full text-center py-xl text-on-surface-variant font-body-lg">
              {doctors.length === 0
                ? "No doctors found matching your criteria."
                : "No doctors match your fee filter. Try adjusting the range."}
            </div>
          )}
          {!isLoading && !error && processedDoctors.map((doctor) => (
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
                <div className="flex items-center justify-between gap-sm pt-xs text-on-surface-variant">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">payments</span>
                    <span className="font-body-sm text-body-sm">Consultation Fee</span>
                  </div>
                  <span className="font-label-md font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ${doctor.consultationFee ?? 50}
                  </span>
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
