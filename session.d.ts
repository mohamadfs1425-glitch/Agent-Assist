/**
 * Calculate BMI from weight (kg) and height (cm).
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Return BMI category string.
 */
export function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

type Gender = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate daily calorie target using Mifflin-St Jeor equation.
 */
export function calculateDailyCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal?: Goal | null,
): number {
  // Mifflin-St Jeor BMR
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  let adjustment = 0;
  if (goal === "lose") adjustment = -500;
  else if (goal === "gain") adjustment = 300;

  return Math.round(tdee + adjustment);
}

/**
 * Calculate macro targets in grams from a calorie target.
 * Macros: 25% protein, 45% carbs, 30% fat
 */
export function calculateMacros(dailyCalories: number): {
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  return {
    proteinG: Math.round((dailyCalories * 0.25) / 4),
    carbsG: Math.round((dailyCalories * 0.45) / 4),
    fatG: Math.round((dailyCalories * 0.30) / 9),
  };
}
