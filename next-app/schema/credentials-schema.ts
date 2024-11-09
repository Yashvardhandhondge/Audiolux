import {z} from 'zod';

export const emailSchema = z.string({message:"Email is required"}).email({message:"Inavalid email"})

export const passwordSchema = z
  .string({ message: "Password is required" })
  .min(5, { message: "Password must be at least 8 characters" })