import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/doctors/$doctorId")({
  head: () => ({
    meta: [
      { title: "Doctor Profile & Availability | HealthCore" },
      { name: "description", content: "View doctor profile details and book an available appointment slot." },
      { property: "og:title", content: "Doctor Profile & Availability | HealthCore" },
      { property: "og:description", content: "View doctor profile details and book an available appointment slot." },
    ],
  }),
  component: lazyRouteComponent(() => import("./doctors.$doctorId-component")),
});
