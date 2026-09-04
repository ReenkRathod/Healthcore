import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

type BookSymptomsSearch = {
  doctorId?: string;
  slotStart?: string;
};

export const Route = createFileRoute("/book/symptoms")({
  validateSearch: (search: Record<string, unknown>): BookSymptomsSearch => {
    const result: BookSymptomsSearch = {};
    if (typeof search["doctorId"] === "string") result.doctorId = search["doctorId"];
    if (typeof search["slotStart"] === "string") result.slotStart = search["slotStart"];
    return result;
  },
  head: () => ({
    meta: [
      { title: "Book Appointment — Symptoms | HealthCore" },
      {
        name: "description",
        content: "Describe your symptoms before confirming your appointment.",
      },
      { property: "og:title", content: "Book Appointment — Symptoms | HealthCore" },
      {
        property: "og:description",
        content: "Describe your symptoms before confirming your appointment.",
      },
    ],
  }),
  component: lazyRouteComponent(() => import("./book.symptoms-component")),
});
