import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/find-doctors")({
  head: () => ({
    meta: [
      { title: "Find Doctors - HealthCore" },
      { name: "description", content: "Search specialists and general practitioners by specialty, location, and availability." },
      { property: "og:title", content: "Find Doctors - HealthCore" },
      { property: "og:description", content: "Search specialists and general practitioners by specialty, location, and availability." },
    ],
  }),
  component: lazyRouteComponent(() => import("./find-doctors-component")),
});
