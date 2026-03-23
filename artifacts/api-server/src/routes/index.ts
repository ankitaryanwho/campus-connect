import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import usersRouter from "./users";
import chatRouter from "./chat";
import walletRouter from "./wallet";
import servicesRouter from "./services";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/users", usersRouter);
router.use("/chat", chatRouter);
router.use("/wallet", walletRouter);
router.use("/services", servicesRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/", syncRouter);

export default router;
