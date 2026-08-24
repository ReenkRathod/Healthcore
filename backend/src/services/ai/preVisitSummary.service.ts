import { prisma } from '../../db/client';
import { generateChatCompletion } from './ai.client';
import { PreVisitSummaryOutputSchema, SerializedPreVisitSummary } from './ai.schemas';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';
import { config } from '../../config';

export async function generateSummaryForAppointment(appointmentId: string) {
  // 1. Load appointment and symptoms
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { symptoms: true },
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  // 2. Safely handle missing symptoms
  if (appointment.symptoms.length === 0) {
    const failedState: SerializedPreVisitSummary = {
      status: 'FAILED',
      error: 'No symptoms provided',
    };
    
    await prisma.preVisitSummary.upsert({
      where: { appointmentId },
      update: { summary: JSON.stringify(failedState) },
      create: {
        appointmentId,
        summary: JSON.stringify(failedState),
      },
    });

    return failedState;
  }

  // Check if LLM is disabled
  if (!config.OPENAI_API_KEY) {
    const failedState: SerializedPreVisitSummary = {
      status: 'FAILED',
      error: 'AI Provider is not configured',
    };
    await prisma.preVisitSummary.upsert({
      where: { appointmentId },
      update: { summary: JSON.stringify(failedState) },
      create: {
        appointmentId,
        summary: JSON.stringify(failedState),
      },
    });
    return failedState;
  }

  // 3. System Instruction
  const systemPrompt = `
You are an AI assistant helping a clinician prepare for a patient visit.
You will be given a list of symptoms provided by the patient.
Your task is to summarize these symptoms into a strictly structured JSON response.

CRITICAL INSTRUCTIONS:
- You are producing an AI-assisted pre-visit summary for a clinician, NOT a diagnosis.
- Do NOT invent symptoms, diagnoses, medications, test results, or medical history.
- If information is insufficient, say so rather than hallucinating.
- The urgency must be one of: "LOW", "MEDIUM", "HIGH".
- The chiefComplaint must be a concise string summarizing the primary issue.
- You must provide EXACTLY 3 suggested questions for the clinician to ask the patient.

Format your output as a JSON object matching this schema:
{
  "urgency": "LOW | MEDIUM | HIGH",
  "chiefComplaint": "...",
  "suggestedQuestions": [
    "...",
    "...",
    "..."
  ]
}
`.trim();

  // 4. User Prompt (Data)
  const patientData = appointment.symptoms.map(
    (s, index) =>
      `Symptom ${index + 1}:\n- Description: ${s.description}\n- Severity: ${s.severity}\n- Duration: ${s.durationDays ?? 'Unknown'} days\n- Notes: ${s.notes ?? 'None'}`
  ).join('\n\n');
  
  const userPrompt = `Patient Symptoms:\n\n${patientData}`;

  let finalState: SerializedPreVisitSummary;

  try {
    // 5. Generate AI Summary
    const llmResponse = await generateChatCompletion(systemPrompt, userPrompt);

    // 6. Validate Output
    const parsedJson = JSON.parse(llmResponse);
    const validatedData = PreVisitSummaryOutputSchema.parse(parsedJson);

    finalState = {
      status: 'SUCCESS',
      data: validatedData,
    };
  } catch (err: any) {
    logger.error({ err, appointmentId }, 'Failed to generate Pre-Visit AI Summary');
    
    finalState = {
      status: 'FAILED',
      error: err.message ?? 'Unknown AI generation error',
    };
  }

  // 7. Store securely in Database
  await prisma.preVisitSummary.upsert({
    where: { appointmentId },
    update: {
      summary: JSON.stringify(finalState),
      modelUsed: config.OPENAI_MODEL,
      // Prompt not saved to avoid logging PII unnecessarily in a plaintext column unless strictly required, 
      // but schema has promptUsed. We omit it here for privacy.
    },
    create: {
      appointmentId,
      summary: JSON.stringify(finalState),
      modelUsed: config.OPENAI_MODEL,
    },
  });

  return finalState;
}

/**
 * Helper to fetch and deserialize the summary safely for a given appointment.
 */
export async function getSummaryForAppointment(appointmentId: string): Promise<SerializedPreVisitSummary | null> {
  const record = await prisma.preVisitSummary.findUnique({
    where: { appointmentId },
  });

  if (!record) return null;

  try {
    return JSON.parse(record.summary) as SerializedPreVisitSummary;
  } catch {
    return { status: 'FAILED', error: 'Corrupted data in database' };
  }
}
