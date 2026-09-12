/**
 * Doctor management service.
 *
 * Handles doctor creation, updates, specialisations, working hours,
 * and leave management.
 */

import { prisma } from '../db/client';
import { hashPassword } from './auth.service';
import { AppError } from '../utils/AppError';
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
  DoctorStatusInput,
  SpecialisationInput,
  SetWorkingHoursInput,
  DoctorLeaveInput,
} from '../validators/doctor.validators';
import { Prisma } from '@prisma/client';

// ─── Helper: Doctor Output Sanitisation ─────────────────────────────────────

export function formatDoctorProfile(doctor: any) {
  const { user, ...profile } = doctor;
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    phone: user?.phone,
    licenseNumber: profile.licenseNumber,
    certificateUrl: profile.certificateUrl ?? null,
    slotDurationMn: profile.slotDurationMn,
    consultationFee: profile.consultationFee ?? 50.0,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    isAccepting: profile.isAccepting,
    isVerifiedByAdmin: profile.isVerifiedByAdmin,
    isActive: user?.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    specialisations: profile.specialisations ?? [],
    workingHours: profile.workingHours ?? [],
    leaves: profile.leaves ?? [],
  };
}

// ─── 1. Create Doctor ───────────────────────────────────────────────────────

export async function createDoctor(data: CreateDoctorInput) {
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        role: 'DOCTOR',
        isVerified: true, // Admin-created doctors are pre-verified
        isActive: true,
        doctorProfile: {
          create: {
            licenseNumber: data.licenseNumber,
            title: data.title ?? null,
            slotDurationMn: data.slotDurationMn,
            bio: data.bio ?? null,
            avatarUrl: data.avatarUrl ?? null,
            isAccepting: true,
            specialisations: data.specialisations && data.specialisations.length > 0
              ? {
                  createMany: {
                    data: data.specialisations.map((s) => ({
                      name: s.name,
                      subSpeciality: s.subSpeciality ?? null,
                      isPrimary: s.isPrimary ?? false,
                    })),
                  },
                }
              : undefined,
          },
        },
      },
      include: {
        doctorProfile: {
          include: {
            specialisations: true,
          },
        },
      },
    });

    return formatDoctorProfile({
      ...user.doctorProfile,
      user,
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const meta = err.meta as Record<string, unknown> | undefined;
        const target = Array.isArray(meta?.['target'])
          ? (meta['target'] as string[]).join(', ')
          : 'field';
        if (target.includes('email')) {
          throw AppError.conflict('An account with this email already exists');
        }
        if (target.includes('license_number') || target.includes('licenseNumber')) {
          throw AppError.conflict('A doctor with this license number already exists');
        }
        if (target.includes('phone')) {
          throw AppError.conflict('A user with this phone number already exists');
        }
        throw AppError.conflict(`A record with this ${target} already exists`);
      }
    }
    throw err;
  }
}

// ─── 2. Get Doctor By ID ────────────────────────────────────────────────────

export async function getDoctorById(doctorProfileId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      user: true,
      specialisations: true,
      workingHours: {
        where: { isActive: true },
      },
      leaves: {
        where: {
          endDate: { gte: new Date() },
        },
      },
    },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  return formatDoctorProfile(doctor);
}

// ─── 3. Update Doctor Profile ───────────────────────────────────────────────

export async function updateDoctor(
  doctorProfileId: string,
  data: UpdateDoctorInput,
) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: { user: true },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  try {
    const userUpdate: Prisma.UserUpdateWithoutDoctorProfileInput = {};
    if (data.firstName !== undefined) userUpdate.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdate.lastName = data.lastName;
    if (data.phone !== undefined) userUpdate.phone = data.phone;

    const updated = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        licenseNumber: data.licenseNumber !== undefined ? data.licenseNumber : undefined,
        slotDurationMn: data.slotDurationMn !== undefined ? data.slotDurationMn : undefined,
        consultationFee: data.consultationFee !== undefined ? data.consultationFee : undefined,
        bio: data.bio !== undefined ? data.bio : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        isAccepting: data.isAccepting !== undefined ? data.isAccepting : undefined,
        ...(Object.keys(userUpdate).length > 0 ? { user: { update: userUpdate } } : {}),
      },
      include: {
        user: true,
        specialisations: true,
        workingHours: true,
      },
    });

    return formatDoctorProfile(updated);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('A doctor with this license number or phone already exists');
    }
    throw err;
  }
}

// ─── 4. Activate / Deactivate Doctor ────────────────────────────────────────

export async function setDoctorStatus(
  doctorProfileId: string,
  data: DoctorStatusInput,
) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorProfileId },
    data: {
      isAccepting: data.isAccepting !== undefined ? data.isAccepting : undefined,
      user: data.isActive !== undefined
        ? {
            update: {
              isActive: data.isActive,
            },
          }
        : undefined,
    },
    include: {
      user: true,
      specialisations: true,
    },
  });

  return formatDoctorProfile(updated);
}

export async function verifyDoctor(doctorProfileId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorProfileId },
    data: {
      isVerifiedByAdmin: true,
    },
    include: {
      user: true,
      specialisations: true,
    },
  });

  return formatDoctorProfile(updated);
}

export async function rejectDoctor(doctorProfileId: string, _reason?: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: { user: true },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  // Deactivate user account so they cannot log in
  const updated = await prisma.doctorProfile.update({
    where: { id: doctorProfileId },
    data: {
      isVerifiedByAdmin: false,
      isAccepting: false,
      user: {
        update: {
          isActive: false,
        },
      },
    },
    include: {
      user: true,
      specialisations: true,
    },
  });

  return formatDoctorProfile(updated);
}



export async function addSpecialisation(
  doctorProfileId: string,
  data: SpecialisationInput,
) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  try {
    const spec = await prisma.doctorSpecialisation.create({
      data: {
        doctorProfileId,
        name: data.name,
        subSpeciality: data.subSpeciality ?? null,
        isPrimary: data.isPrimary ?? false,
      },
    });
    return spec;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict(
        `Specialisation '${data.name}' is already assigned to this doctor`,
      );
    }
    throw err;
  }
}

export async function removeSpecialisation(
  doctorProfileId: string,
  specialisationId: string,
) {
  const spec = await prisma.doctorSpecialisation.findFirst({
    where: {
      id: specialisationId,
      doctorProfileId,
    },
  });

  if (!spec) {
    throw AppError.notFound('Specialisation record not found for this doctor');
  }

  await prisma.doctorSpecialisation.delete({
    where: { id: specialisationId },
  });
}

// ─── 6. Working Hours ───────────────────────────────────────────────────────

export async function setWorkingHours(
  doctorProfileId: string,
  data: SetWorkingHoursInput,
) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  // Upsert working hours for each item specified
  const results = await prisma.$transaction(
    data.workingHours.map((item) =>
      prisma.doctorWorkingHours.upsert({
        where: {
          uq_doctor_day_hours: {
            doctorProfileId,
            dayOfWeek: item.dayOfWeek,
          },
        },
        update: {
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive,
        },
        create: {
          doctorProfileId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive,
        },
      }),
    ),
  );

  return results;
}

export async function getWorkingHours(doctorProfileId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  return prisma.doctorWorkingHours.findMany({
    where: { doctorProfileId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

// ─── 7. Doctor Leaves ───────────────────────────────────────────────────────

export async function addDoctorLeave(
  doctorProfileId: string,
  data: DoctorLeaveInput,
) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  const startDateObj = new Date(data.startDate);
  const endDateObj = new Date(data.endDate);

  // Check for existing overlapping leave entries for this doctor
  const existingOverlap = await prisma.doctorLeave.findFirst({
    where: {
      doctorProfileId,
      startDate: { lte: endDateObj },
      endDate: { gte: startDateObj },
    },
  });

  if (existingOverlap) {
    throw AppError.conflict(
      'Doctor already has leave scheduled that overlaps with this date range',
    );
  }

  const leave = await prisma.doctorLeave.create({
    data: {
      doctorProfileId,
      startDate: startDateObj,
      endDate: endDateObj,
      reason: data.reason ?? null,
      isFullDay: data.isFullDay,
      leaveStartTime: data.isFullDay ? null : data.leaveStartTime ?? null,
      leaveEndTime: data.isFullDay ? null : data.leaveEndTime ?? null,
    },
  });

  return leave;
}

export async function getDoctorLeaves(doctorProfileId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  return prisma.doctorLeave.findMany({
    where: { doctorProfileId },
    orderBy: { startDate: 'asc' },
  });
}

export async function removeDoctorLeave(
  doctorProfileId: string,
  leaveId: string,
) {
  const leave = await prisma.doctorLeave.findFirst({
    where: {
      id: leaveId,
      doctorProfileId,
    },
  });

  if (!leave) {
    throw AppError.notFound('Doctor leave record not found');
  }

  await prisma.doctorLeave.delete({
    where: { id: leaveId },
  });
}

// ─── 8. Doctor Discovery / Listing ──────────────────────────────────────────

export async function listDoctors(query: {
  specialisation?: string;
  isAccepting?: boolean;
  search?: string;
  isAdminView?: boolean;
}) {
  const whereClause: Prisma.DoctorProfileWhereInput = {
    user: {
      isActive: true,
    },
    ...(query.isAccepting !== undefined ? { isAccepting: query.isAccepting } : {}),
  };

  if (!query.isAdminView) {
    whereClause.isVerifiedByAdmin = true;
  }

  if (query.specialisation) {
    whereClause.specialisations = {
      some: {
        name: {
          contains: query.specialisation,
          mode: 'insensitive',
        },
      },
    };
  }

  if (query.search) {
    const searchStr = query.search.trim();
    whereClause.OR = [
      {
        user: {
          firstName: { contains: searchStr, mode: 'insensitive' },
        },
      },
      {
        user: {
          lastName: { contains: searchStr, mode: 'insensitive' },
        },
      },
      {
        specialisations: {
          some: {
            name: { contains: searchStr, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const doctors = await prisma.doctorProfile.findMany({
    where: whereClause,
    include: {
      user: true,
      specialisations: true,
    },
    orderBy: {
      user: {
        lastName: 'asc',
      },
    },
  });

  return doctors.map(formatDoctorProfile);
}

export async function listSpecialisations() {
  const specs = await prisma.doctorSpecialisation.groupBy({
    by: ['name'],
    _count: {
      id: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return specs.map((s) => ({
    name: s.name,
    doctorCount: s._count.id,
  }));
}
