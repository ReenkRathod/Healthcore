import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/doctor/")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard | HealthCore Professional" },
      {
        name: "description",
        content:
          "Provider dashboard with today's schedule, pending notes, and quick clinical actions.",
      },
      { property: "og:title", content: "Doctor Dashboard | HealthCore Professional" },
      {
        property: "og:description",
        content:
          "Provider dashboard with today's schedule, pending notes, and quick clinical actions.",
      },
    ],
  }),
  component: lazyRouteComponent(() => import("./doctor.index-component")),
});
