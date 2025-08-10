import Joi from "joi";

export const accountSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
  type: Joi.string().valid("bank", "wallet", "investment", "loan").required(),
  currency: Joi.string().trim().default("INR"),
  balance: Joi.number().precision(2).default(0),
  meta: Joi.object().unknown(true).default({}),
});

export const transactionSchema = Joi.object({
  account_id: Joi.string().length(24).required(),
  type: Joi.string().valid("expense", "income", "transfer").required(),
  amount: Joi.number().greater(0).precision(2).required(),
  currency: Joi.string().trim().default("INR"),
  category: Joi.string().trim().required(),
  note: Joi.string().allow("").default(""),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  attachment_ids: Joi.array().items(Joi.string().length(24)).default([]),
});
