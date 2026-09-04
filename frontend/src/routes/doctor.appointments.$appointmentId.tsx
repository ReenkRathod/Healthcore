import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/doctor/appointments/$appointmentId")({
  head: () => ({
    meta: [
      { title: "Appointment Consultation - HealthCore Provider" },
      { name: "description", content: "View patient vitals, AI pre-visit summary, clinical notes, and manage prescriptions for this appointment." },
      { property: "og:title", content: "Appointment Consultation - HealthCore Provider" },
      { property: "og:description", content: "View patient vitals, AI pre-visit summary, clinical notes, and manage prescriptions for this appointment." },
    ],
  }),
  component: lazyRouteComponent(
    () => import("./doctor.appointments.$appointmentId-component"),
  ),
});
