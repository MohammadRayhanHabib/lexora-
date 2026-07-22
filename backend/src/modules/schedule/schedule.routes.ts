import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import * as ctrl from "./schedule.controller";

const router = Router();

router.use(authenticate);

router.get("/", ctrl.getItems);
router.post("/", ctrl.createItem);
router.put("/:id", ctrl.updateItem);
router.delete("/:id", ctrl.deleteItem);

export default router;
