import express from "express";
import { TokenController } from "../controllers/tokenController";

const router = express.Router();
const tokenController = new TokenController();

// Get all tokens
router.get("/", (req, res) => tokenController.getAllTokens(req, res));

// Get tokens by network
router.get("/network/:network", (req, res) => tokenController.getTokensByNetwork(req, res));

// Add a new token
router.post("/", (req, res) => tokenController.addToken(req, res));

// Update a token
router.put("/:id", (req, res) => tokenController.updateToken(req, res));

// Delete a token
router.delete("/:id", (req, res) => tokenController.deleteToken(req, res));

export default router;
