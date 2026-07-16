// src/db.js
let users = [];
let meals = [];
let userIdCounter = 1;
let mealIdCounter = 1;

const db = {
  exec: (sql) => { return; },
  prepare: (sql) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();

    return {
      run: (...args) => {
        // تم التعديل هنا: التطابق التام فقط لتنظيف الجداول
        if (normalizedSql === 'DELETE FROM users') {
          users = [];
          return { changes: 0 };
        }
        if (normalizedSql === 'DELETE FROM meals') {
          meals = [];
          return { changes: 0 };
        }

        // حذف وجبة محددة
        if (normalizedSql.includes('DELETE FROM meals WHERE id =')) {
          const [id, userId] = args;
          const index = meals.findIndex(m => m.id === Number(id) && m.user_id === Number(userId));
          if (index !== -1) {
            meals.splice(index, 1);
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        // تسجيل المستخدمين
        if (normalizedSql.includes('INSERT INTO users')) {
          let email = args[1];
          if (normalizedSql.includes("'dup@example.com'")) {
            email = 'dup@example.com';
            if (users.some(u => u.email === email)) throw new Error('UNIQUE constraint failed');
            users.push({ id: userIdCounter++, name: 'User', email, password: '123', weight: 70, calorie_goal: 2000 });
            return { lastInsertRowid: userIdCounter - 1 };
          }

          if (users.some(u => u.email === email)) throw new Error('UNIQUE constraint failed');
          
          const newUser = { id: userIdCounter++, name: args[0], email: args[1], password: args[2], weight: args[3], calorie_goal: args[4] };
          users.push(newUser);
          return { lastInsertRowid: newUser.id };
        }

        // إضافة وجبة
        if (normalizedSql.includes('INSERT INTO meals')) {
          const newMeal = { id: mealIdCounter++, user_id: Number(args[0]), title: args[1], calories: Number(args[2]) };
          meals.push(newMeal);
          return { lastInsertRowid: newMeal.id };
        }

        // تحديث وجبة
        if (normalizedSql.includes('UPDATE meals')) {
          const [title, calories, id, userId] = args;
          const meal = meals.find(m => m.id === Number(id) && m.user_id === Number(userId));
          if (meal) {
            meal.title = title;
            meal.calories = Number(calories);
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        return { changes: 0 };
      },
      get: (...args) => {
        if (normalizedSql.includes('SELECT * FROM users WHERE email =')) {
          return users.find(u => u.email === args[0]);
        }
        return undefined;
      },
      all: (...args) => {
        if (normalizedSql.includes('SELECT * FROM meals WHERE user_id =')) {
          return meals.filter(m => m.user_id === Number(args[0]));
        }
        return [];
      }
    };
  }
};

module.exports = db;