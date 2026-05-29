/** Zod schemas matching backend Pydantic models. */
import { z } from "zod";
import { CATEGORY_LIST } from "./categories";

export const expenseSchema = z.object({
 amount: z.number().positive("Amount must be positive").max(9999999, "Amount too large"),
 category: z.enum(CATEGORY_LIST as [string, ...string[]]),
 description: z.string().max(500).optional(),
 timestamp: z.string().min(1, "Date required"),
 mood: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const loginSchema = z.object({
 email: z.string().email("Invalid email"),
 password: z.string().min(8, "Minimum 8 characters"),
});

export const registerSchema = z.object({
 email: z.string().email("Invalid email"),
 password: z.string().min(8, "Minimum 8 characters"),
 confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
 message: "Passwords don't match", path: ["confirmPassword"],
});

