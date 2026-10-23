# מעבדת הכימיה הקטנה

משחק כימיה בסיסית לילדים בגיל 10, כאפליקציה וובית שאפשר להתקין בטלפון ובמחשב.

## קבצים

- index.html — האפליקציה כולה
- manifest.webmanifest — הגדרות ההתקנה
- sw.js — עבודה בלי אינטרנט
- icon-192.png, icon.svg — אייקונים
- worker/ — שרת המדריכה ב-Cloudflare Worker (לא נדחף לגיטהאב)
- Code.gs — הגרסה הקודמת של השרת, בגוגל אפס סקריפט (לא בשימוש)

## שרת המדריכה

השרת רץ ב-Cloudflare, בחשבון uchi.mata1@gmail.com, בכתובת:
https://chem-lab-guide.uchimata99.workers.dev

הכתובת מופיעה בקובץ index.html בשורה const ASK_URL.
המפתח שמור כסוד של ה-Worker בשם ANTHROPIC_API_KEY (בלוח הבקרה: Settings ← Variables and Secrets), ולא בקוד.

לעדכון השרת, מתוך התיקייה worker:

    npx wrangler deploy

מגבלה: עד 200 שאלות ביום (DAILY_LIMIT בקובץ worker/worker.js). המונה שמור ב-KV בשם chem-lab-counts.
השרת מקבל בקשות רק מ-https://uchimata99.github.io (ORIGIN בקובץ worker/worker.js).
