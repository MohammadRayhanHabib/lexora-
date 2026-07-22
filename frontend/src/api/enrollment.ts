import api from "./axios";

// ─── Enums (mirror backend) ───────────────────────────────────────────────────
export enum EnrollmentType {
  CAM_OFFICIAL_BOOK = "cam_official_book",
  POPULAR_TESTS = "popular_tests",
  RECENT_TESTS = "recent_tests",
  INDIVIDUAL_MODULE = "individual_module",
}

export enum EnrolledModule {
  LISTENING = "listening",
  READING = "reading",
  WRITING = "writing",
  SPEAKING = "speaking",
}

// ─── Display metadata ─────────────────────────────────────────────────────────
export const ENROLLMENT_META: Record<
  EnrollmentType,
  { label: string; description: string; icon: string; color: string }
> = {
  [EnrollmentType.CAM_OFFICIAL_BOOK]: {
    label: "Cam Official Book",
    description:
      "Cambridge IELTS official practice tests from authentic exam materials.",
    icon: "book",
    color: "from-blue-600 to-blue-800",
  },
  [EnrollmentType.POPULAR_TESTS]: {
    label: "Popular Tests",
    description:
      "Top-rated practice tests used by thousands of successful IELTS candidates.",
    icon: "star",
    color: "from-amber-500 to-amber-700",
  },
  [EnrollmentType.RECENT_TESTS]: {
    label: "Recent Tests",
    description:
      "Latest tests reflecting the most current IELTS exam patterns and topics.",
    icon: "clock",
    color: "from-emerald-500 to-emerald-700",
  },
  [EnrollmentType.INDIVIDUAL_MODULE]: {
    label: "Individual Module",
    description:
      "Focus on a single IELTS module — Reading, Listening, Writing, or Speaking.",
    icon: "layers",
    color: "from-primary-600 to-primary-800",
  },
};

export const MODULE_META: Record<
  EnrolledModule,
  { label: string; color: string; bg: string }
> = {
  [EnrolledModule.READING]: {
    label: "Reading",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  [EnrolledModule.LISTENING]: {
    label: "Listening",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  [EnrolledModule.WRITING]: {
    label: "Writing",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  [EnrolledModule.SPEAKING]: {
    label: "Speaking",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface IEnrollment {
  _id: string;
  userId: string;
  type: EnrollmentType;
  module?: EnrolledModule;
  isActive: boolean;
  expiresAt?: string;
  enrolledAt: string;
  updatedAt: string;
}

// ─── API functions ────────────────────────────────────────────────────────────
export const enrollmentApi = {
  getMyEnrollments: async (): Promise<IEnrollment[]> => {
    const { data } = await api.get("/enrollment/my");
    return data.data;
  },

  enroll: async (
    type: EnrollmentType,
    module?: EnrolledModule,
    expiresInDays?: number,
  ): Promise<IEnrollment> => {
    const { data } = await api.post("/enrollment", {
      type,
      module,
      expiresInDays,
    });
    return data.data;
  },

  unenroll: async (
    type: EnrollmentType,
    module?: EnrolledModule,
  ): Promise<void> => {
    await api.delete("/enrollment", { data: { type, module } });
  },

  // Admin
  adminListEnrollments: async (params?: {
    userId?: string;
    type?: EnrollmentType;
  }): Promise<IEnrollment[]> => {
    const { data } = await api.get("/enrollment/admin/all", { params });
    return data.data;
  },

  adminDeleteEnrollment: async (id: string): Promise<void> => {
    await api.delete(`/enrollment/admin/${id}`);
  },
};
