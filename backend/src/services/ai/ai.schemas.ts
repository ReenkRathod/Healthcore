import { z } from 'zod';

export const PreVisitSummaryOutputSchema = z.object({
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).length(3, 'Exactly 3 suggested questions are required'),
});

export type PreVisitSummaryOutput = z.infer<typeof PreVisitSummaryOutputSchema>;

export type SerializedPreVisitSummary = 
  | {
      status: 'SUCCESS';
      data: PreVisitSummaryOutput;
    }
  | {
      status: 'FAILED';
      error: string;
    };
