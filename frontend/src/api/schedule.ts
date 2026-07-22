import api from "./axios";

export type ItemType = "task" | "event";
export type Priority = "low" | "medium" | "high";

export interface IScheduleItem {
  _id: string;
  userId: string;
  type: ItemType;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority?: Priority;
  completed: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateScheduleItemDto = {
  type: ItemType;
  title: string;
  description?: string;
  date: string;
  time?: string;
  priority?: Priority;
  color: string;
};

export type UpdateScheduleItemDto = Partial<
  CreateScheduleItemDto & { completed: boolean }
>;

export const scheduleApi = {
  getAll: async (): Promise<IScheduleItem[]> => {
    const { data } = await api.get("/schedule");
    return data.data;
  },

  create: async (dto: CreateScheduleItemDto): Promise<IScheduleItem> => {
    const { data } = await api.post("/schedule", dto);
    return data.data;
  },

  update: async (
    id: string,
    dto: UpdateScheduleItemDto,
  ): Promise<IScheduleItem> => {
    const { data } = await api.put(`/schedule/${id}`, dto);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule/${id}`);
  },
};
