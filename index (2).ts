import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable } from "@workspace/db";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import rateLimit from "express-rate-limit"; // 🛡️ استدعاء مكتبة الحماية

const router: IRouter = Router();

// 🛡️ برمجة جدار الحماية ضد التخمين (Brute-Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // السماح بـ 5 محاولات فقط لكل IP
  message: { error: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ name, email: email.toLowerCase(), passwordHash })
    .returning();

  req.session.userId = user.id;

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasProfile: false,
  });
});

// 🛡️ تطبيق جدار الحماية هنا على مسار الدخول الفعلي
router.post("/auth/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasProfile: !!profile,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasProfile: !!profile,
  });
});

export default router;