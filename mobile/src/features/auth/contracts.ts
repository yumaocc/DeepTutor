import {z} from 'zod';

export const authStatusSchema = z.object({
  enabled: z.boolean(),
  authenticated: z.boolean(),
  user_id: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  is_admin: z.boolean().optional(),
  subject_type: z.enum(['account', 'guest', 'local']).nullable().optional(),
  guest_trial_available: z.boolean().optional(),
  trial: z
    .object({
      enabled: z.boolean(),
      status: z.string(),
      turns_used: z.number().int().nonnegative(),
      turns_limit: z.number().int().positive(),
      turns_remaining: z.number().int().nonnegative(),
      tokens_used: z.number().int().nonnegative(),
      tokens_limit: z.number().int().positive(),
      tokens_remaining: z.number().int().nonnegative(),
      cost_used_usd: z.number().nonnegative(),
      cost_limit_usd: z.number().nonnegative(),
      expires_at: z.number().positive(),
    })
    .nullable()
    .optional(),
});

export const guestSessionResponseSchema = z.object({
  ok: z.literal(true),
  subject_type: z.enum(['guest', 'local']),
  access_token: z.string().min(1).nullable(),
  user_id: z.string().min(1),
  username: z.string().min(1),
  role: z.string().min(1),
  is_admin: z.boolean(),
  trial: authStatusSchema.shape.trial,
});

export const registrationStatusSchema = z.object({
  is_first_user: z.boolean(),
});

export const loginResponseSchema = z.object({
  ok: z.literal(true),
  user_id: z.string().min(1),
  username: z.string().min(1),
  role: z.string().min(1),
  is_admin: z.boolean(),
  access_token: z.string().min(1).nullable().optional(),
  claim: z
    .object({
      claimed: z.boolean(),
      guest_id: z.string(),
      session_count: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
});

export type AuthStatus = z.infer<typeof authStatusSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type GuestSessionResponse = z.infer<typeof guestSessionResponseSchema>;
