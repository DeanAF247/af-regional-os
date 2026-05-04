# SOP — Adding a New Club to AF Regional OS

> **Use this checklist every time a new club is acquired or opened.**
> Work top-to-bottom. Each step is a distinct code change or database action.

---

## Step 1 — Add the Club to the Supabase Database

Run this in the Supabase SQL editor (or via the Table Editor):

```sql
INSERT INTO clubs (name, status)
VALUES ('<Club Name>', 'active');
```

> Example: `VALUES ('Wyong', 'active');`

This makes the club available in **Enter KPIs**, **Group Overview**, and all Supabase-driven queries.

---

## Step 2 — Add the Club to the Sidebar Navigation

**File:** `components/sidebar.tsx`

Find the `CLUBS` array (around line 23) and add a new entry:

```ts
const CLUBS = [
  // … existing clubs …
  { name: "<Club Name>", slug: "<club-slug>" },  // ← ADD THIS
];
```

> Slug rules: lowercase, spaces → hyphens. E.g. `"Newcastle West"` → `"newcastle-west"`.

---

## Step 3 — Add the Club Slug to the Group Overview Page

**File:** `app/(dashboard)/page.tsx`

Find `CLUB_SLUGS` (around line 13) and add:

```ts
const CLUB_SLUGS: Record<string, string> = {
  // … existing slugs …
  "<Club Name>": "<club-slug>",  // ← ADD THIS
};
```

---

## Step 4 — Add the Club to the Projects Module

**File:** `app/(dashboard)/projects/page.tsx`

Find the `CLUBS` array (around line 40) and insert the club name before `"Group"`:

```ts
const CLUBS = [
  "All Clubs","Greenhills","Thornton","Newcastle West","Kotara","Edgeworth","Lake Haven","Toukley",
  "<Club Name>",  // ← ADD HERE (before "Group")
  "Group"
];
```

---

## Step 5 — Add the Club to the Year Overview Page

**File:** `app/(dashboard)/kpis/year/page.tsx`

Find `CLUB_ORDER` (around line 8) and add:

```ts
const CLUB_ORDER = [
  // … existing clubs …
  "<Club Name>",  // ← ADD THIS
];
```

---

## Step 6 — Create the Club Detail Page (if needed)

If the club needs its own detail page (e.g. `/clubs/wyong`), duplicate an existing club page:

```
app/(dashboard)/clubs/[clubId]/page.tsx
```

The `[clubId]` dynamic route already handles all clubs by slug — **no new page file is needed** as long as the slug is consistent across all files.

---

## Step 7 — Verify Everything Works

After making the changes, check:

- [ ] Club appears in the **Sidebar → Clubs** list
- [ ] Club appears in **Group Overview** club cards (once KPIs are entered)
- [ ] Club appears in the **Enter KPIs** table row
- [ ] Club is selectable in the **Projects** module club filter and modal
- [ ] Club appears in the **Year Overview** table columns
- [ ] Clicking the club in the sidebar goes to `/clubs/<slug>` without a 404

---

## Quick Reference — Current Clubs

| Club Name       | Slug             |
|-----------------|------------------|
| Greenhills      | `greenhills`     |
| Thornton        | `thornton`       |
| Newcastle West  | `newcastle-west` |
| Kotara          | `kotara`         |
| Edgeworth       | `edgeworth`      |
| Lake Haven      | `lake-haven`     |
| Toukley         | `toukley`        |

---

## Files Checklist Summary

| File | Change |
|------|--------|
| Supabase `clubs` table | INSERT new row |
| `components/sidebar.tsx` | Add to `CLUBS` array |
| `app/(dashboard)/page.tsx` | Add to `CLUB_SLUGS` |
| `app/(dashboard)/projects/page.tsx` | Add to `CLUBS` array |
| `app/(dashboard)/kpis/year/page.tsx` | Add to `CLUB_ORDER` |

That's it — 1 database insert + 4 code changes.
