#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║  הרצת ההגדרות על בסיס הנתונים — בלי שמחרוזת החיבור תודפס לעולם     ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# **למה סקריפט ולא פקודה.** מחרוזת החיבור של Supabase מכילה את סיסמת
# בסיס הנתונים. פקודה שמקבלת אותה בשורת הפקודה נשמרת בהיסטוריית
# ה-shell, מופיעה ב-`ps`, ונכתבת לתמלול השיחה. כאן היא נקראת מ-stdin
# עם `read -s`, היא לא מהדהדת למסך, לא נכנסת להיסטוריה, ולא מודפסת
# בשום שלב — גם לא בשגיאה.
#
# שימוש:
#   bash scripts/dbpush.sh
#   (הדביקו את מחרוזת החיבור, Enter)
#
# את המחרוזת לוקחים מ-Supabase → Project Settings → Database →
# Connection string → **URI**, ומחליפים את [YOUR-PASSWORD] בסיסמה.
# היא נראית כך:
#   postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
#
# מה זה מריץ — שלושה קבצים, בסדר הזה, וכולם בטוחים להרצה חוזרת:
#   1. push-setup.sql        — טבלת המינויים להתראות
#   2. deposits-setup.sql    — יומן ההפקדות, הסימונים והמשיכות
#   3. push-snooze-setup.sql — עמודת הדחייה, והתצוגה המתוקנת
set -euo pipefail
cd "$(dirname "$0")/.."

printf 'הדביקו את מחרוזת החיבור (לא תוצג על המסך): '
IFS= read -rs DB_URL
printf '\n'

if [ -z "${DB_URL:-}" ]; then
  echo 'לא התקבלה מחרוזת. בוטל.' >&2
  exit 1
fi
case "$DB_URL" in
  postgresql://*|postgres://*) ;;
  *) echo 'המחרוזת לא נראית כמו URI של Postgres. בוטל.' >&2; exit 1 ;;
esac

export DB_URL
echo '  מריץ את שלוש ההגדרות…'
# ‏2>&1 עובר דרך sed שמוחק כל הופעה של המחרוזת, כדי ששגיאה של ה-CLI
# לא תדליף אותה לפלט.
if supabase db push --db-url "$DB_URL" --include-all --yes 2>&1 \
     | sed "s|${DB_URL}|<DB_URL>|g; s|postgres[a-z]*://[^ ]*|<DB_URL>|g"; then
  echo '  ✓ הסתיים.'
else
  echo '  ✗ נכשל — הפלט למעלה, בלי מחרוזת החיבור.' >&2
  exit 1
fi
