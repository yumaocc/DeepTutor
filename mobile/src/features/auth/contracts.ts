import {z} from 'zod';

export const authStatusSchema = z.object({
  enabled: z.boolean(),
  authenticated: z.boolean(),
  user_id: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  is_admin: z.boolean().optional(),
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
});

export type AuthStatus = z.infer<typeof authStatusSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
