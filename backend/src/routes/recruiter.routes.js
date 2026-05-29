import { Router } from "express";
import {
  registerRecruiter,
  getRecruiterProfile,
  updateRecruiterProfile,
  addContact,
  getContacts,
  removeContact,
  saveSearch,
  deleteSearch,
  requestSubscription,
  approveSubscription,
} from "../controllers/recruiter.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/register", verifyJWT, registerRecruiter);
router.get("/profile", verifyJWT, getRecruiterProfile);
router.put("/profile", verifyJWT, updateRecruiterProfile);

router.post("/contacts", verifyJWT, addContact);
router.get("/contacts", verifyJWT, getContacts);
router.delete("/contacts/:contactId", verifyJWT, removeContact);

router.post("/searches", verifyJWT, saveSearch);
router.delete("/searches/:searchId", verifyJWT, deleteSearch);

router.post("/subscription", verifyJWT, requestSubscription);
router.post("/subscription/:subscriptionRequestId/approve", approveSubscription);

export default router;
