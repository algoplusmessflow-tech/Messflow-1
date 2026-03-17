# CLAUDE.md — Project Instructions for AI Agents

Read `.gsd/GSD.md` before making any changes to this codebase.

## Quick Rules
- Stack: React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase
- Never edit `src/integrations/supabase/types.ts` manually
- Never create placeholder comments like `{/* ... (same as original) ... */}`
- Never gut existing working code — always maintain 100% feature parity
- All Supabase queries go through custom hooks in `src/hooks/`
- Run `npm run build` after every change to verify TypeScript compiles
- Test UI at 400px mobile width
- Keep `.env` credentials out of all output
