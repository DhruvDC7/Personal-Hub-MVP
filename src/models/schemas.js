import Joi from "joi";

export const accountSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
  type: Joi.string().valid("bank", "wallet", "investment", "loan").required(),
  currency: Joi.string().trim().default("INR"),
  balance: Joi.number().precision(2).default(0),
  meta: Joi.object().unknown(true).default({}),
});

export const transactionSchema = Joi.object({
  type: Joi.string().valid("expense", "income", "transfer").required(),
  // Single-account fields for expense/income
  account_id: Joi.alternatives().conditional('type', {
    is: 'transfer',
    then: Joi.forbidden(),
    otherwise: Joi.string().length(24).required(),
  }),
  // Transfer fields
  from_account_id: Joi.alternatives().conditional('type', {
    is: 'transfer',
    then: Joi.string().length(24).required(),
    otherwise: Joi.forbidden(),
  }),
  to_account_id: Joi.alternatives().conditional('type', {
    is: 'transfer',
    then: Joi.string().length(24).required(),
    otherwise: Joi.forbidden(),
  }),
  amount: Joi.number().greater(0).precision(2).required(),
  currency: Joi.string().trim().default("INR"),
  category: Joi.alternatives().conditional('type', {
    is: 'transfer',
    then: Joi.string().trim().default('Transfer'),
    otherwise: Joi.string().trim().required(),
  }),
  note: Joi.string().allow("").default(""),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  attachment_ids: Joi.array().items(Joi.string().length(24)).default([]),
});
