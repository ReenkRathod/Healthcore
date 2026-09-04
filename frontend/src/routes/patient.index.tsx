import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/patient/")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard - HealthCore" },
      {
        name: "description",
        content:
          "View your upcoming appointments, quick actions, and recent visit summaries in your HealthCore patient dashboard.",
      },
      { property: "og:title", content: "Patient Dashboard - HealthCore" },
      {
        property: "og:description",
        content:
          "View your upcoming appointments, quick actions, and recent visit summaries in your HealthCore patient dashboard.",
      },
    ],
  }),
  component: lazyRouteComponent(() => import("./patient.index-component")),
});
