import { z } from "zod";

const usernameRegex = /^[a-zA-Z0-9_.]+$/;

export const loginSchema = z.object({
  identifier: z.string().min(3, "أدخل اسم المستخدم أو البريد الإلكتروني"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const coachRegisterSchema = z
  .object({
    name: z.string().min(2, "الاسم مطلوب").max(80),
    brandName: z.string().max(80).optional().or(z.literal("")),
    username: z
      .string()
      .min(3, "اسم المستخدم 3 أحرف على الأقل")
      .max(30)
      .regex(usernameRegex, "أحرف إنجليزية وأرقام و _ . فقط"),
    email: z.string().email("بريد إلكتروني غير صالح"),
    phone: z
      .string()
      .min(6, "رقم هاتف غير صالح")
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "رقم هاتف غير صالح"),
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type CoachRegisterInput = z.infer<typeof coachRegisterSchema>;
