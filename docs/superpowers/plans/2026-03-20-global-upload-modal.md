# Global Upload Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dedicated `/upload` page with a globally accessible Upload Modal, fixing transition blindness on the landing page and improving SaaS UX.

**Architecture:** Use a React Context (`UploadModalContext`) to manage modal open/close state. Render a sticky, glassmorphic `<GlobalUploadModal>` containing the existing `<FileUploader>` near the root in `providers.tsx`. Replace `<Link href="/upload">` elements in the `Navbar` and Home `page.tsx` hero section with an `openModal()` trigger. Finally, delete the `apps/web/src/app/upload` directory entirely.

**Tech Stack:** React 19, Next.js App Router, TailwindCSS.

---

### Task 1: Create Upload Modal Context

**Files:**
- Create: `apps/web/src/contexts/UploadModalContext.tsx`
- Modify: `apps/web/src/app/providers.tsx`

- [ ] **Step 1: Write Context code**
Create `UploadModalContext`, exposing `isOpen`, `openModal`, and `closeModal`. The provider should wrap `children` and hold the boolean state.
- [ ] **Step 2: Wrap application in new context**
Update `providers.tsx` to include `<UploadModalProvider>` wrapping the existing contexts and children.

### Task 2: Build Global Upload Modal Component

**Files:**
- Create: `apps/web/src/components/GlobalUploadModal.tsx`
- Modify: `apps/web/src/app/providers.tsx`

- [ ] **Step 1: Write the modal component**
Create a full-screen overlay component with fixed positioning (`fixed inset-0`), high z-index (`z-50`), and a dark semi-transparent backdrop (`bg-slate-900/50 backdrop-blur-sm`). Inside, a centered dialog box containing `<FileUploader />`. Return `null` if `!isOpen`. Add an 'X' close button to the top right of the modal box.
- [ ] **Step 2: Add modal to providers**
Insert `<GlobalUploadModal />` inside the `<UploadModalProvider>` in `providers.tsx` so it renders globally above all other content.

### Task 3: Update Navbar and Remove Upload Page

**Files:**
- Modify: `apps/web/src/components/Navbar.tsx`
- Delete: `apps/web/src/app/upload/page.tsx`
- Remove dir: `apps/web/src/app/upload`

- [ ] **Step 1: Refactor Navbar**
Ensure `Navbar.tsx` uses `"use client"` directive since it will consume context. Replace `<Link href="/upload">` on the "New Report" / "Upload Report" button with a standard `<button>` that fires `openModal()` when clicked.
- [ ] **Step 2: Delete upload route**
Remove the `apps/web/src/app/upload/page.tsx` file and its parent folder to officially deprecate the dedicated routing.

### Task 4: Functionalize the Home Hero

**Files:**
- Create: `apps/web/src/components/HeroUploadTrigger.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Extract Hero Upload Trigger**
Since `page.tsx` is a Server Component, extract the `<Link href="/upload">` and its child mock-panel content into a new Client Component named `HeroUploadTrigger.tsx`.
- [ ] **Step 2: Hook up the trigger**
Inside `HeroUploadTrigger.tsx`, import `useUploadModal`, turn the wrapper into an `onClick={openModal}` interactive element instead of a navigation link. Clicking the mock panel on the home page will instantly pop the new Global Upload Modal.

### Task 5: QA and Build Check

**Files:** None

- [ ] **Step 1: Build the app locally**
Run `cd apps/web && pnpm run build` to verify standard Next.js compilation works without errors (especially checking for routing or Server/Client component context usage).
