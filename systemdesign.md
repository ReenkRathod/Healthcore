# System Design: Healthcare Appointment Manager

This document outlines the core architectural decisions and mechanisms used to ensure reliability, concurrency safety, and robustness in the healthcare appointment platform.

## 1. Double-Booking Prevention

Preventing double-booking is critical in a healthcare setting. The platform ensures that no two patients can successfully book a doctor for the exact same time slot, even if they click "Book" at the exact same millisecond. This is achieved through a combination of database constraints and strict transactional isolation.

*   **Transactional Boundaries:** The entire appointment booking flow is wrapped in a monolithic database transaction. If any step fails, the entire operation rolls back.
*   **PostgreSQL Advisory Locks:** To serialize concurrent booking attempts, the system utilizes `pg_advisory_xact_lock()`. A deterministic, unique lock key is generated using the doctor's profile ID and the requested ISO timestamp (e.g., `doc:123:slot:2026-08-25T10:00:00Z`). When multiple concurrent requests attempt to book the same slot, the database forces them into a queue. Only one transaction can hold the lock at a time.
*   **In-Transaction Validation:** Once the advisory lock is successfully acquired, the transaction immediately queries the database for any existing non-cancelled appointments that overlap with the requested slot boundary. If a collision is found (because the transaction that held the lock immediately prior just booked it), the current transaction rolls back, and the user receives an HTTP 409 Conflict error.

## 2. Doctor Leave Conflict Handling

Doctors' schedules are dynamic. Unpredicted leaves, half-days, or vacations must instantly invalidate overlapping appointment slots to prevent patients from booking a doctor who will not be present.

*   **Availability Engine Filtering:** When a patient views a doctor's calendar, the `getDoctorAvailability` service dynamically calculates available slots. It first generates a grid based on standard weekly working hours. It then queries the `doctorLeave` table for any records overlapping the requested date. Any slot that intersects with a full-day leave or a specific partial-day leave window is immediately stripped from the availability response.
*   **Just-In-Time Verification:** To prevent race conditions—such as a doctor submitting a sudden leave request at the exact moment a patient is booking a slot—the leave validation logic is fully re-executed *inside* the booking transaction block, *after* acquiring the advisory lock. If the requested slot is found to fall within a newly registered leave window, the booking is aborted.

## 3. Slot Hold Mechanism

In a high-traffic environment, users require a brief window to finalize their booking (e.g., entering symptoms, filling out intake forms, or processing payments) without the frustration of the slot being "sniped" by another user before they can submit the form.

*   **Distributed Cache (Redis):** A slot hold mechanism is implemented using a high-speed, in-memory data store like Redis. When a patient initiates the booking flow for a specific time, a temporary key is written (e.g., `hold:doc_123:slot_1000`).
*   **Time-To-Live (TTL):** This key is assigned a strict TTL of 5 to 10 minutes. While this key exists, the availability engine actively masks this slot from other patients, effectively reserving it.
*   **Resolution:** If the patient successfully completes the booking, the permanent PostgreSQL transaction is committed, and the Redis hold key is proactively deleted. If the patient abandons the page, their browser crashes, or the timer runs out, the Redis key automatically expires and evaporates. The slot is then instantly freed back into the public availability pool without requiring any heavy database cleanup jobs.

## 4. Notification Failure Handling

Healthcare applications rely on reliable communication for appointment confirmations, cancellations, and medication reminders. Synchronous API calls to third-party email or SMS providers are prone to latency and failure, which should not affect the core application's performance.

*   **Asynchronous Message Queue:** Notifications are never sent synchronously during the HTTP request. Instead, when an appointment is booked, a lightweight JSON payload is published to a persistent message broker (e.g., Redis BullMQ, RabbitMQ, or AWS SQS). The HTTP response is returned to the patient immediately, providing a fast user experience.
*   **Worker Process & Exponential Backoff:** Dedicated background worker processes consume messages from the queue and interface with the external communication APIs (like SendGrid or Twilio). If a third-party gateway fails due to downtime or rate limiting, the worker automatically retries sending the message. It uses an exponential backoff strategy (waiting 2s, then 4s, 8s, etc.) to prevent overwhelming the provider and to ride out brief outages.
*   **Dead-Letter Queue (DLQ):** If a notification consistently fails after the maximum configured retries (e.g., due to a hard-bounced email address or a revoked API key), the message is routed to a Dead-Letter Queue. System administrators are alerted to monitor the DLQ, ensuring that no critical patient communications are silently dropped and that permanent failures can be manually investigated.
