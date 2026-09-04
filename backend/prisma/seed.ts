import { PrismaClient, DayOfWeek } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test seed cannot run in production');
  }

  console.log('Seeding development test accounts...');

  const patientEmail = process.env.TEST_PATIENT_EMAIL || 'patient.test@example.com';
  const patientPassword = process.env.TEST_PATIENT_PASSWORD || 'PatientTest@12345';
  
  const doctorEmail = process.env.TEST_DOCTOR_EMAIL || 'doctor.test@example.com';
  const doctorPassword = process.env.TEST_DOCTOR_PASSWORD || 'DoctorTest@12345';
  
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminTest@12345';

  const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  // Helper to hash passwords using exact same mechanism
  const getHash = async (password: string) => await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // 1. PATIENT
  const patientHash = await getHash(patientPassword);
  await prisma.user.upsert({
    where: { email: patientEmail },
    update: {
      passwordHash: patientHash, // Sync password if changed
      firstName: 'Test',
      lastName: 'Patient',
      isActive: true,
      role: 'PATIENT',
    },
    create: {
      email: patientEmail,
      passwordHash: patientHash,
      firstName: 'Test',
      lastName: 'Patient',
      role: 'PATIENT',
      isVerified: true,
      patientProfile: {
        create: {}
      }
    }
  });
  console.log(`✅ Upserted PATIENT: ${patientEmail}`);

  // 2. DOCTOR
  const doctorHash = await getHash(doctorPassword);
  const doctor = await prisma.user.upsert({
    where: { email: doctorEmail },
    update: {
      passwordHash: doctorHash,
      firstName: 'Test',
      lastName: 'Doctor',
      isActive: true,
      role: 'DOCTOR',
    },
    create: {
      email: doctorEmail,
      passwordHash: doctorHash,
      firstName: 'Test',
      lastName: 'Doctor',
      role: 'DOCTOR',
      isVerified: true,
      doctorProfile: {
        create: {
          licenseNumber: 'DOC-TEST-12345',
          slotDurationMn: 30,
          consultationFee: 75.0,
          isAccepting: true,
          isVerifiedByAdmin: true,
          specialisations: {
            create: {
              name: 'General Medicine',
              isPrimary: true,
            }
          }
        }
      }
    },
    include: { doctorProfile: true }
  });

  // Ensure Doctor has Working Hours
  if (doctor.doctorProfile) {
    const existingHours = await prisma.doctorWorkingHours.findFirst({
      where: { doctorProfileId: doctor.doctorProfile.id }
    });

    if (!existingHours) {
      // Create Monday to Friday, 09:00 to 17:00
      const days = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ];
      for (const day of days) {
        await prisma.doctorWorkingHours.create({
          data: {
            doctorProfileId: doctor.doctorProfile.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
          }
        });
      }
      console.log(`✅ Created Working Hours for DOCTOR`);
    }
  }
  console.log(`✅ Upserted DOCTOR: ${doctorEmail}`);

  // 3. ADMIN
  const adminHash = await getHash(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      firstName: 'Test',
      lastName: 'Administrator',
      isActive: true,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      firstName: 'Test',
      lastName: 'Administrator',
      role: 'ADMIN',
      isVerified: true,
    }
  });
  console.log(`✅ Upserted ADMIN: ${adminEmail}`);

  // 4. REALISTIC WORKFLOW TEST DATA
  console.log('Seeding workflow data (Appointment, Symptoms, AI, Notes)...');
  
  const patientRecord = await prisma.user.findUnique({ where: { email: patientEmail }, include: { patientProfile: true } });
  const patientProfileId = patientRecord?.patientProfile?.id;
  const doctorProfileId = doctor.doctorProfile?.id;

  if (patientProfileId && doctorProfileId) {
    // Determine a slotStart (tomorrow at 10:00 AM UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const slotEnd = new Date(tomorrow);
    slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + 30); // 30 min duration

    const TEST_APPOINTMENT_ID = 'test-appointment-12345';

    // Appointment
    await prisma.appointment.upsert({
      where: { id: TEST_APPOINTMENT_ID },
      update: {
        slotStart: tomorrow,
        slotEnd: slotEnd,
        status: 'COMPLETED',
      },
      create: {
        id: TEST_APPOINTMENT_ID,
        patientProfileId,
        doctorProfileId,
        slotStart: tomorrow,
        slotEnd: slotEnd,
        status: 'COMPLETED',
        reasonForVisit: 'Persistent headaches and mild fever',
      }
    });

    // Symptom
    const TEST_SYMPTOM_ID = 'test-symptom-12345';
    await prisma.symptom.upsert({
      where: { id: TEST_SYMPTOM_ID },
      update: {},
      create: {
        id: TEST_SYMPTOM_ID,
        appointmentId: TEST_APPOINTMENT_ID,
        description: 'Severe headache in the frontal region',
        severity: 'MODERATE',
        durationDays: 3,
        notes: 'Painkillers are not helping much',
      }
    });

    // PreVisitSummary
    const TEST_PRE_VISIT_ID = 'test-previsit-12345';
    await prisma.preVisitSummary.upsert({
      where: { id: TEST_PRE_VISIT_ID },
      update: {},
      create: {
        id: TEST_PRE_VISIT_ID,
        appointmentId: TEST_APPOINTMENT_ID,
        summary: 'Patient reports a 3-day history of moderate frontal headaches and mild fever, unresponsive to OTC analgesics. Consider tension headache or mild viral infection.',
        modelUsed: 'gpt-4o-mini',
      }
    });

    // PostVisitNote (SOAP)
    const TEST_POST_VISIT_ID = 'test-postvisit-12345';
    await prisma.postVisitNote.upsert({
      where: { id: TEST_POST_VISIT_ID },
      update: {},
      create: {
        id: TEST_POST_VISIT_ID,
        appointmentId: TEST_APPOINTMENT_ID,
        subjective: 'Patient reports 3 days of frontal headaches. Pain is 6/10.',
        objective: 'Vitals stable. No neurological deficits. Mild sinus tenderness.',
        assessment: 'Tension headache vs mild sinusitis.',
        plan: 'Prescribed Ibuprofen and advised rest. Follow up in 1 week if no improvement.',
        followUpNeeded: true,
        followUpInDays: 7,
      }
    });

    // Prescription
    const TEST_PRESCRIPTION_ID = 'test-prescription-12345';
    await prisma.prescription.upsert({
      where: { id: TEST_PRESCRIPTION_ID },
      update: {},
      create: {
        id: TEST_PRESCRIPTION_ID,
        appointmentId: TEST_APPOINTMENT_ID,
        medicationName: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'every 6-8 hours as needed',
        durationDays: 5,
        instructions: 'Take with food.',
      }
    });

    // PostVisitAiSummary
    const TEST_POST_AI_ID = 'test-postai-12345';
    await prisma.postVisitAiSummary.upsert({
      where: { id: TEST_POST_AI_ID },
      update: {},
      create: {
        id: TEST_POST_AI_ID,
        appointmentId: TEST_APPOINTMENT_ID,
        summary: 'Your doctor noted that your vital signs are stable and there are no signs of nerve issues. The diagnosis is likely a tension headache or mild sinus infection. You have been prescribed Ibuprofen to help with the pain. Please take it with food and rest well. If you don\'t feel better in 7 days, please follow up.',
        modelUsed: 'gpt-4o-mini',
      }
    });
    
    console.log(`✅ Upserted Workflow Data (Appointment, Symptoms, AI, Notes)`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
