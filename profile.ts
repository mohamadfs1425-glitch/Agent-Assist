import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, diaryEntriesTable, foodItemsTable, profilesTable } from "@workspace/db";
import { AddDiaryEntryBody, DeleteDiaryEntryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { calculateDailyCalories } from "../lib/calculations";

const router: IRouter = Router();

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/diary/summary", requireAuth, async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : getTodayString();
  const userId = req.session.userId!;

  const entries = await db
    .select({
      entry: diaryEntriesTable,
      food: foodItemsTable,
    })
    .from(diaryEntriesTable)
    .innerJoin(foodItemsTable, eq(diaryEntriesTable.foodItemId, foodItemsTable.id))
    .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.date, date)));

  const enriched = entries.map(({ entry, food }) => {
    const factor = entry.amountGrams / 100;
    return {
      id: entry.id,
      userId: entry.userId,
      foodItemId: entry.foodItemId,
      foodName: food.name,
      amountGrams: entry.amountGrams,
      mealType: entry.mealType,
      date: entry.date,
      calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
      fat: Math.round(food.fatPer100g * factor * 10) / 10,
    };
  });

  const totalCalories = enriched.reduce((s, e) => s + e.calories, 0);
  const totalProtein = enriched.reduce((s, e) => s + e.protein, 0);
  const totalCarbs = enriched.reduce((s, e) => s + e.carbs, 0);
  const totalFat = enriched.reduce((s, e) => s + e.fat, 0);

  // Get calorie target from profile
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  let calorieTarget = 2000;
  if (profile) {
    calorieTarget = calculateDailyCalories(
      profile.weightKg,
      profile.heightCm,
      profile.age,
      profile.gender as "male" | "female",
      profile.activityLevel as "sedentary" | "light" | "moderate" | "active" | "very_active",
      profile.goal as "lose" | "maintain" | "gain" | null,
    );
  }

  res.json({
    date,
    totalCalories: Math.round(totalCalories * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    calorieTarget,
    remainingCalories: Math.round((calorieTarget - totalCalories) * 10) / 10,
    entries: enriched,
  });
});

router.get("/diary", requireAuth, async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : getTodayString();
  const userId = req.session.userId!;

  const entries = await db
    .select({
      entry: diaryEntriesTable,
      food: foodItemsTable,
    })
    .from(diaryEntriesTable)
    .innerJoin(foodItemsTable, eq(diaryEntriesTable.foodItemId, foodItemsTable.id))
    .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.date, date)));

  res.json(
    entries.map(({ entry, food }) => {
      const factor = entry.amountGrams / 100;
      return {
        id: entry.id,
        userId: entry.userId,
        foodItemId: entry.foodItemId,
        foodName: food.name,
        amountGrams: entry.amountGrams,
        mealType: entry.mealType,
        date: entry.date,
        calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
        protein: Math.round(food.proteinPer100g * factor * 10) / 10,
        carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
        fat: Math.round(food.fatPer100g * factor * 10) / 10,
      };
    }),
  );
});

router.post("/diary", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddDiaryEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { foodItemId, amountGrams, mealType, date } = parsed.data;
  const userId = req.session.userId!;
  const entryDate = date ?? getTodayString();

  const [food] = await db.select().from(foodItemsTable).where(eq(foodItemsTable.id, foodItemId));
  if (!food) {
    res.status(400).json({ error: "Food item not found" });
    return;
  }

  const [entry] = await db
    .insert(diaryEntriesTable)
    .values({ userId, foodItemId, amountGrams, mealType, date: entryDate })
    .returning();

  const factor = amountGrams / 100;
  res.status(201).json({
    id: entry.id,
    userId: entry.userId,
    foodItemId: entry.foodItemId,
    foodName: food.name,
    amountGrams: entry.amountGrams,
    mealType: entry.mealType,
    date: entry.date,
    calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
    fat: Math.round(food.fatPer100g * factor * 10) / 10,
  });
});

router.delete("/diary/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteDiaryEntryParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const userId = req.session.userId!;

  const [deleted] = await db
    .delete(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, parsed.data.id), eq(diaryEntriesTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
