import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/doctors")({
  head: () => ({
    meta: [
      { title: "Doctor Management | HealthCore Admin" },
      {
        name: "description",
        content: "Manage hospital staff, availability, and active status for doctors on the HealthCore platform.",
      },
      { property: "og:title", content: "Doctor Management | HealthCore Admin" },
      {
        property: "og:description",
        content: "Manage hospital staff, availability, and active status for doctors on the HealthCore platform.",
      },
    ],
  }),
  component: lazyRouteComponent(() => import("./admin.doctors-component")),
});
