import { Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { ApiResponse } from "../../utils/response";
import * as svc from "./schedule.service";

export async function getItems(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const items = await svc.getItemsByUser(req.user!.id);
    ApiResponse.success(res, items);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function createItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { type, title, description, date, time, priority, color } = req.body;
    if (!type || !title || !date || !color) {
      ApiResponse.badRequest(res, "type, title, date and color are required");
      return;
    }
    const item = await svc.createItem(req.user!.id, {
      type,
      title,
      description,
      date,
      time,
      priority,
      color,
    });
    ApiResponse.created(res, item);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function updateItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const item = await svc.updateItem(req.user!.id, id, req.body);
    if (!item) {
      ApiResponse.badRequest(res, "Item not found or not yours");
      return;
    }
    ApiResponse.success(res, item);
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}

export async function deleteItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await svc.deleteItem(req.user!.id, id);
    if (!ok) {
      ApiResponse.badRequest(res, "Item not found or not yours");
      return;
    }
    ApiResponse.success(res, null, "Deleted");
  } catch (err: any) {
    ApiResponse.error(res, err.message);
  }
}
