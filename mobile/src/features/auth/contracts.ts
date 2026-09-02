import {z} from 'zod';

export const authStatusSchema = z.object({
  enabled: z.boolean(),
  authenticated: z.boolean(),
  user_id: z.string().optional(),
  username: z.string().optional(),
  role: z.string().optional(),
  is_admin: z.boolean().optional(),
});

export const registrationStatusSchema = z.object({
  auth_enabled: z.boolean(),
  is_first_user: z.boolean(),
  registration_open: z.boolean(),
});

export const mobileLoginResponseSchema = z
  .object({
    auth_enabled: z.boolean(),
    access_token: z.string().min(1).nullable(),
    token_type: z.literal('bearer'),
    expires_in: z.number().int().nonnegative(),
    user_id: z.string().min(1),
    username: z.string().min(1),
    role: z.string().min(1),
    is_admin: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.auth_enabled && !value.access_token) {
      context.addIssue({
        code: 'custom',
        path: ['access_token'],
        message: 'Authenticated mobile login must return an access token',
      });
    }
  });

export type AuthStatus = z.infer<typeof authStatusSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type MobileLoginResponse = z.infer<typeof mobileLoginResponseSchema>;
