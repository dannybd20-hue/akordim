#!/bin/bash
# מוחק מהיסטוריית הגיט את כל הגרסאות הישנות של קבצי הנתונים המוצפנים (*.bin) – נשארת רק הגרסה הנוכחית.
# שימוש: bash tools/purge_history.sh /path/to/git-filter-repo   (מתוך תיקיית הריפו, אחרי commit+push רגיל)
set -e
GFR=${1:-git-filter-repo}
cd "$(git rev-parse --show-toplevel)"
URL=$(git remote get-url origin)
git fetch -q origin && git reset -q --hard origin/main
[ "$(git rev-parse --is-shallow-repository)" = true ] && git fetch -q --unshallow origin
KEEP=$(mktemp); ALL=$(mktemp); STRIP=$(mktemp)
git ls-tree -r HEAD | awk '$4 ~ /\.bin$/ {print $3}' | sort -u > $KEEP
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(rest)' | awk '$1=="blob" && $3 ~ /\.bin$/ {print $2}' | sort -u > $ALL
comm -23 $ALL $KEEP > $STRIP
echo "גרסאות ישנות למחיקה: $(wc -l < $STRIP)"
[ -s $STRIP ] || { echo "אין מה למחוק"; exit 0; }
python3 $GFR --strip-blobs-with-ids $STRIP --force --quiet
git remote add origin "$URL" 2>/dev/null || git remote set-url origin "$URL"
git push -q --force origin main
git fetch -q origin && git branch -q -u origin/main
git reflog expire --expire=now --all && git gc -q --prune=now --aggressive
echo PURGE_OK
