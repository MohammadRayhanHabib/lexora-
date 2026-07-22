import { AppDataSource } from "../../config/database";
import { ScheduleItem, ItemType, Priority } from "../../entities/ScheduleItem";
import { ObjectId } from "mongodb";

const repo = () => AppDataSource.getMongoRepository(ScheduleItem);

export async function getItemsByUser(userId: string): Promise<ScheduleItem[]> {
  return repo().find({ where: { userId } });
}

export async function createItem(
  userId: string,
  data: {
    type: ItemType;
    title: string;
    description?: string;
    date: string;
    time?: string;
    priority?: Priority;
    color: string;
  },
): Promise<ScheduleItem> {
  const item = repo().create({ ...data, userId, completed: false });
  return repo().save(item);
}

export async function updateItem(
  userId: string,
  id: string,
  data: Partial<{
    type: ItemType;
    title: string;
    description: string;
    date: string;
    time: string;
    priority: Priority;
    color: string;
    completed: boolean;
  }>,
): Promise<ScheduleItem | null> {
  const item = await repo().findOne({
    where: { _id: new ObjectId(id) as any },
  });
  if (!item || item.userId !== userId) return null;
  Object.assign(item, data);
  return repo().save(item);
}

export async function deleteItem(userId: string, id: string): Promise<boolean> {
  const item = await repo().findOne({
    where: { _id: new ObjectId(id) as any },
  });
  if (!item || item.userId !== userId) return false;
  await repo().remove(item);
  return true;
}
