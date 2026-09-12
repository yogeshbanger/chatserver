import { body } from "express-validator";

export const createGroupValidator = [
  body("name").trim().notEmpty().withMessage("Group name is required"),
  body("members")
    .isArray({ min: 1 })
    .withMessage("At least one member is required"),
];