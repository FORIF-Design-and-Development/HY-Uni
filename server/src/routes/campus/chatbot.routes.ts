import { Router } from "express";
import { postChatbot } from "../../controllers/campus/chatbot.controller";

const router = Router();

router.post("/chatbot", postChatbot);

export default router;