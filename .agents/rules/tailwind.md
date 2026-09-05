# Tailwind CSS v4 Styling Guidelines & Rules

All components, views, and styles in this project MUST strictly follow **Tailwind CSS v4** syntax and best practices:

## 1. Spacing & Sizes (No Arbitrary Pixel Brackets)
- NEVER write arbitrary pixel brackets like `w-[10px]`, `h-[20px]`, `max-w-[85px]`, `min-h-[160px]`.
- Always use the Tailwind v4 spacing scale (`1 unit = 4px` / `0.25rem`) using standard or decimal numbers:
  - `w-[10px]` ❌ -> `w-2.5` ✅
  - `max-w-[85px]` ❌ -> `max-w-21.25` ✅ (or `max-w-20` / `max-w-24`)
  - `max-w-[100px]` ❌ -> `max-w-25` ✅
  - `max-w-[120px]` ❌ -> `max-w-30` ✅
  - `w-[500px]` ❌ -> `w-125` ✅
  - `h-[350px]` ❌ -> `h-87.5` ✅
  - `min-w-[40px]` ❌ -> `min-w-10` ✅
  - `min-h-[160px]` ❌ -> `min-h-40` ✅

## 2. Gradients
- NEVER use legacy Tailwind v3 `bg-gradient-to-*` syntax.
- ALWAYS use Tailwind v4 `bg-linear-to-*`:
  - `bg-gradient-to-r` ❌ -> `bg-linear-to-r` ✅
  - `bg-gradient-to-b` ❌ -> `bg-linear-to-b` ✅
  - `bg-gradient-to-tr` ❌ -> `bg-linear-to-tr` ✅
  - `bg-gradient-to-br` ❌ -> `bg-linear-to-br` ✅

## 3. Important Modifier (`!`)
- Place the exclamation point `!` at the **end** of the class name, never at the beginning:
  - `!relative` ❌ -> `relative!` ✅
  - `!w-10` ❌ -> `w-10!` ✅
  - `!min-w-[40px]` ❌ -> `min-w-10!` ✅
  - `!hidden` ❌ -> `hidden!` ✅

## 4. Typography & Word Breaking
- `break-words` ❌ -> `wrap-break-word` ✅
