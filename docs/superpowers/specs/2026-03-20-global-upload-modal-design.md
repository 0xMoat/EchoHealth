# Design Spec: Global Upload Modal & Hero Functionality
**Date:** 2026-03-20
**Feature:** Transitioning from a dedicated `/upload` page to a globally accessible Upload Modal & functional Landing Page Hero.

## 1. Objective
To solve the "Transition Blindness" UX issue where users click a mock upload area on the home page and are unexpectedly redirected to a visually identical `/upload` page. The solution involves deleting the dedicated `/upload` route and replacing it with a functional Hero component + a globally accessible Upload Modal (accessible from the Navbar). This creates a frictionless, premium SaaS experience.

## 2. Architecture & Approach
### 2.1 State Management (Global Modal)
- Implement a global state mechanism (Zustand store or React Context, e.g., `useUploadStore`) to control the visibility of the Upload Modal (`isOpen`, `openModal()`, `closeModal()`).
- This allows any component (like the Navbar's "New Report" button) to trigger the upload flow without a page load.

### 2.2 Global Upload Modal Component
- Create `<GlobalUploadModal />` and mount it at the root of the layout (`app/layout.tsx` or inside `providers.tsx`).
- It will feature a glassmorphic/blur overlay background.
- Inside the modal, we will reuse the existing `<FileUploader />` logic (file dropzone, language selection, clear file list, max file limits).
- Mobile layout will likely be a bottom-sheet presentation or full-screen overlay to ensure usability on smaller devices.

### 2.3 Functional Hero Refactor (`apps/web/src/app/page.tsx`)
- The Hero section will no longer be a dumb `Link` wrapped around visual mocks.
- It will embed the core upload UI logic directly. Dragging a file into the Hero section will accept the file.
- If the user clicks "Generate Video" from the Hero:
  - If they haven't uploaded a file, it acts as a file browser trigger.
  - If a file is attached: If authenticated -> proceeds to upload API; If unauthenticated -> prompts auth flow.

### 2.4 Navigational Clean-up
- Update `<Navbar />` to remove the `<Link href="/upload">` wrapper on "New Report" and instead attach an `onClick={() => openModal()}` handler.
- Delete the `apps/web/src/app/upload` directory, completely removing the `/upload` path from the Next.js App Router.

## 3. Data Flow & Authentication Constraints
Since users might upload files from the completely unauthenticated landing page:
1. **Pre-Auth Upload**: We need to handle files temporarily in local browser state.
2. **Auth Intercept**: When the user initiates "Generate Video" with files selected, the system checks for a valid session. If missing, it saves the file metadata and redirects to sign-in, or presents a login modal. 
3. **Post-Upload Redirect**: Once files are successfully sent to the server (either from the Hero or the Global Modal), the user is redirected to `/dashboard` (or a specific pending report view) to view processing status.

## 4. Error Handling & Edge Cases
- **Accidental Closure**: Warning prompt if trying to close the modal while an upload stream to the server is actively in progress.
- **Large Files**: Validation of file size bounds on the client side before allowing the modal/hero to attempt an upload.
