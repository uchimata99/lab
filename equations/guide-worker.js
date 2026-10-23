// שרת המדריכה המשותף לשני המשחקים (מעבדת הכימיה ומאזני המשוואות).
// גרסה מעודכנת של worker/worker.js מהתיקייה chem: מוסיפה הנחיות למשחק המשוואות כשנשלח app: 'math'.
// להחלפה: להעתיק את הקובץ הזה במקום worker/worker.js ולהריץ npx wrangler deploy.
const MODEL = 'claude-haiku-5-5';
const DAILY_LIMIT = 200;
const MAX_TOKENS = 600;
const ORIGIN = 'https://uchimata99.github.io';

function systemFor(app, topic, slide) {
  if (app === 'math') {
    return 'את מורה חמה וסבלנית למתמטיקה, ומדברת עם ילדה מחוננת בכיתה ד׳. ' +
      'הנושא: "' + topic + '". השקף שהיא רואה: "' + slide + '". ' +
      'כללים: עני בעברית פשוטה, בלשון נקבה כלפיה, ב־2 עד 4 משפטים קצרים. השתמשי בדימוי המאזניים כשזה עוזר. ' +
      'בלי מילים באנגלית ובלי עיצוב (בלי כוכביות או רשימות), אבל מותר לכתוב משוואות עם x ו־y. ' +
      'בלי סימן כפל ובלי נקודתיים במשוואה: כותבים 5x, וחילוק כשבר. ' +
      'אם היא מבקשת פתרון של תרגיל, תני רמז לצעד הראשון ולא את התשובה. ' +
      'אם השאלה לא קשורה, החזירי בעדינות לנושא. בסוף אפשר להוסיף שאלה קטנה שמעוררת סקרנות.';
  }
  return 'את מדריכה חמה וסבלנית במעבדת כימיה, ומדברת עם ילדה בת 10. ' +
    'הנושא עכשיו: "' + topic + '". השקף שהיא רואה: "' + slide + '". ' +
    'כללים: עני בעברית פשוטה בלבד, בלשון נקבה כלפיה, ב־2 עד 4 משפטים קצרים. השתמשי בדוגמה מהבית או מהחיים. ' +
    'בלי מילים באנגלית ובלי עיצוב (בלי כוכביות או רשימות). אפשר אימוג\'י אחד. ' +
    'אם השאלה לא קשורה למדע, החזירי אותה בעדינות לנושא. ' +
    'לעולם אל תציעי לטעום חומרים, לערבב חומרי ניקוי, להדליק אש או לעשות ניסוי בלי מבוגר. ' +
    'אם את לא בטוחה, אמרי שזו שאלה מצוינת לשאול מורה. בסוף אפשר להוסיף שאלה קטנה שמעוררת סקרנות.';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors_() });
    if (request.method === 'GET') return json_({ ok: true });
    if (request.method !== 'POST') return json_({ error: 'bad' });
    try {
      const body = JSON.parse((await request.text()) || '{}');
      if (!(await underLimit_(env))) return json_({ error: 'limit' });
      const app = body.app === 'math' ? 'math' : 'chem';
      const topic = String(body.topic || '').slice(0, 120);
      const slide = String(body.slide || '').slice(0, 600);
      const turns = (Array.isArray(body.turns) ? body.turns : [])
        .slice(-8)
        .filter(t => t && (t.role === 'user' || t.role === 'assistant') && t.content)
        .map(t => ({ role: t.role, content: String(t.content).slice(0, 1200) }));
      while (turns.length && turns[0].role !== 'user') turns.shift();
      if (!turns.length || turns[turns.length - 1].role !== 'user') return json_({ error: 'bad' });
      if (!env.ANTHROPIC_API_KEY) return json_({ error: 'nokey' });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        // בלי חשיבה מוקדמת, אחרת היא אוכלת את כל הטוקנים ולא נשאר טקסט לתשובה
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, system: systemFor(app, topic, slide), messages: turns })
      });
      if (!res.ok) { console.error(res.status, await res.text()); return json_({ error: 'upstream' }); }
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      if (!text) console.error('empty', data.stop_reason, JSON.stringify(data.content));
      return json_(text ? { text } : { error: 'empty', stop: data.stop_reason });
    } catch (err) {
      console.error(err);
      return json_({ error: 'upstream' });
    }
  }
};

async function underLimit_(env) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const k = 'count_' + day;
  const n = Number((await env.COUNTS.get(k)) || 0);
  if (n >= DAILY_LIMIT) return false;
  await env.COUNTS.put(k, String(n + 1), { expirationTtl: 60 * 60 * 48 });
  return true;
}
function cors_() {
  return { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json_(o) {
  return new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors_() } });
}
