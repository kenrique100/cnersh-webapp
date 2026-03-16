# Software Requirements Specification (SRS)

## CNERSH Web Application — National Ethics Committee for Health Research on Humans

---

**Document Version:** 1.0  
**Date:** 2026-03-16  
**Application Name:** CNERSH Web Application (`cnec-webapp`)  
**Classification:** MVP + Full Use-Case Specification

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture & Technology Stack](#3-system-architecture--technology-stack)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [MVP Scope](#5-mvp-scope)
6. [Detailed Use Cases & Workflows](#6-detailed-use-cases--workflows)
   - 6.1 Authentication Module
   - 6.2 Public Home / Feed
   - 6.3 Dashboard
   - 6.4 Protocol Submission (Research Ethics Review)
   - 6.5 Feed / Social Posts
   - 6.6 Community Discussion
   - 6.7 Notifications
   - 6.8 User Profile & Settings
   - 6.9 Admin Panel
   - 6.10 User Management
   - 6.11 Content Moderation
   - 6.12 Audit Logs
   - 6.13 CMS Pages (Admin-Managed)
   - 6.14 Support / Help Center
   - 6.15 Public Pages
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Database Schema Summary](#8-database-schema-summary)
9. [External Integrations & API Endpoints](#9-external-integrations--api-endpoints)
10. [Glossary](#10-glossary)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete and detailed description of the CNERSH Web Application. It defines the functional and non-functional requirements, all user roles, use cases, and the end-to-end workflows of every feature in the application. It is intended for developers, project stakeholders, reviewers, and testers.

### 1.2 Scope

The CNERSH Web Application is a secure, production-grade digital platform for the **National Ethics Committee for Health Research on Humans (CNERSH)** of Cameroon. The platform enables researchers, public health professionals, and institutions to:

- Submit research protocols for ethical review and approval.
- Track the status of submitted protocols in real time.
- Engage with the CNERSH community through a social feed and structured discussion forums.
- Receive institutional announcements and updates.
- Access official documents, policies, and resources managed by administrators.

The platform serves three distinct user groups: the general public (unauthenticated), registered researchers/users, and administrative staff.

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|------------|
| CNERSH | National Ethics Committee for Health Research on Humans |
| SRS | Software Requirements Specification |
| MVP | Minimum Viable Product |
| PI | Principal Investigator |
| Protocol | A submitted research project awaiting ethical review |
| Tracking Code | A unique identifier assigned to each protocol submission |
| Feed | The public social news feed of posts and announcements |
| Community | A structured discussion forum with categorised channels |
| Admin | A staff member with elevated management privileges |
| Superadmin | A staff member with full system-wide privileges |

### 1.4 References

- Better Auth documentation (authentication framework)
- Next.js 16 App Router documentation
- Prisma ORM documentation
- PostgreSQL documentation

---

## 2. Overall Description

### 2.1 Product Perspective

The CNERSH web application is a standalone, full-stack web platform built with Next.js 16 (React, App Router) on the front end and a PostgreSQL database accessed via Prisma ORM on the back end. Authentication is handled by the Better Auth library. The system operates as a single deployable web application accessible via browser on desktop and mobile devices.

### 2.2 Product Functions (High-Level)

1. **Public Access** — Unauthenticated visitors can read the community feed, browse official pages, and track protocol submission status by code.
2. **User Registration & Authentication** — Email/password registration, sign-in, password recovery.
3. **Protocol Submission** — A multi-step, 17-section wizard for submitting research protocols for ethical review, with auto-save and document upload.
4. **Protocol Tracking** — Real-time status tracking of submitted protocols via unique tracking codes.
5. **Social Feed** — Post text, images, videos, links, and tags. React, comment, and share.
6. **Community Discussions** — Categorised topic channels with real-time-style chat/replies, media, polls, and events.
7. **Notifications** — In-app notifications for protocol status changes, comments, likes, mentions, and system announcements.
8. **Profile Management** — Update personal information, profile picture, bio, profession, and password.
9. **Admin Dashboard** — Statistics, charts, content moderation, protocol review assignment, user management, and audit logging.
10. **CMS Pages** — Admin-managed dynamic pages for official documents, policies, and resources.
11. **Support Chat** — In-app help/support chatbox that sends messages to administrators.

### 2.3 User Classes and Characteristics

| User Class | Description |
|------------|-------------|
| Guest (Unauthenticated) | Can read the public feed, browse pages, and use the protocol tracker. Cannot post, comment, or interact. |
| Registered User | Can submit protocols, post to the feed, participate in discussions, receive notifications, and manage their profile. |
| Admin | All user capabilities, plus protocol review management, content moderation, user management, and CMS editing. Cannot manage other admins. |
| Superadmin | Full system access including all admin capabilities plus the ability to manage admin accounts, access all audit logs, and override all content restrictions. |

### 2.4 Operating Environment

- **Platform:** Web browser (Chrome, Firefox, Safari, Edge — latest two versions)
- **Devices:** Desktop computers, tablets, and mobile phones (responsive design)
- **Theme:** Light and Dark mode support
- **Language:** English (primary), French (bilingual support in protocol forms and study summaries)

### 2.5 Design and Implementation Constraints

- The application uses Next.js App Router server components for data fetching.
- Authentication sessions are managed by Better Auth with PostgreSQL session storage.
- File uploads are handled as base64-encoded data URLs (images: ≤ 8 MB; videos and documents: ≤ 50 MB).
- All server actions are protected by session checks; unauthenticated requests receive 401 responses.
- Protocol draft data is auto-saved to localStorage every 30 seconds using the key `cnersh-protocol-draft`.

---

## 3. System Architecture & Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 16 (React, App Router, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui component library |
| Authentication | Better Auth (with admin plugin) |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| File Upload | Internal API route (`/api/upload`) — base64 data URL encoding |
| Link Previews | Internal API route (`/api/link-preview`) — OG metadata scraping (cached 24 h) |
| Package Manager | npm |
| Build Command | `npm run build` / `npx next build` |
| TypeScript Check | `npx tsc --noEmit` |
| Prisma Client | `npx prisma generate` (output: `src/generated/prisma` — non-default path explicitly configured in `prisma/schema.prisma` via `generator client { output = "../src/generated/prisma" }`) |

---

## 4. User Roles & Permissions

### 4.1 Role Definitions

The system uses three roles assigned at the database level on the `User.role` field.

| Role | Value | Capabilities |
|------|-------|--------------|
| Regular User | `user` (or null) | Feed CRUD (own posts), protocol submission, community participation, notifications, profile management |
| Admin | `admin` | All user capabilities + protocol review, content moderation, user management, CMS pages, audit log view |
| Superadmin | `superadmin` | All admin capabilities + ban/unban admins, toggle topic chat for any topic, manage admin-level users, full audit log access |

### 4.2 Role-Based Access Control Details

- **Dashboard Sidebar:** Admin and superadmin see additional navigation sections (Admin, Analytics). Regular users do not see the Community link.
- **Community Announcements:** Only admins and superadmins can create topics in the "Announcements" category; doing so sends a system notification to all users.
- **Protocol Review:** Only admins and superadmins can view all submitted protocols, update their status, and assign reviewers.
- **User Management:** Only admins and superadmins can view, ban, warn, and manage users.
- **Chat Toggle:** The topic creator or a superadmin can enable/disable the reply (chat) feature for a community topic.
- **Feed Moderation:** Admins and superadmins can delete any post or comment; regular users can only delete their own.
- **Delete Permission Override:** The `hasDeletePermission` flag on the User model can grant a regular user elevated delete rights.

---

## 5. MVP Scope

The Minimum Viable Product encompasses the core features required for CNERSH to begin operating its digital ethics review process. The MVP is defined as:

### 5.1 In-Scope for MVP

| # | Feature | Priority |
|---|---------|----------|
| 1 | User registration (email + password), email verification, sign-in, password reset | Critical |
| 2 | Protocol submission form (multi-step wizard, 17 steps, document uploads) | Critical |
| 3 | Protocol tracking by unique code (available to guests) | Critical |
| 4 | Protocol status management by admins (DRAFT → SUBMITTED → PENDING_REVIEW → APPROVED / REJECTED) | Critical |
| 5 | Reviewer assignment for protocols | Critical |
| 6 | Admin notifications on new protocol submissions | Critical |
| 7 | User notifications on protocol status changes | Critical |
| 8 | User profile creation and editing | High |
| 9 | Public social feed (posts with text, image, video, link) | High |
| 10 | In-app notifications centre | High |
| 11 | Basic admin dashboard with stats | High |
| 12 | User management (list, ban, warn users) | High |
| 13 | Audit logging of all admin actions | High |
| 14 | CMS-managed public pages (About, Policy, Terms, Accessibility) | Medium |
| 15 | Community discussion forum (topics, replies, categories) | Medium |
| 16 | Support chatbox for user–admin communication | Medium |
| 17 | Dark/light mode | Low |
| 18 | Link preview cards in feed | Low |
| 19 | Trending tags sidebar | Low |

### 5.2 Deferred (Post-MVP)

- Real-time WebSocket notifications
- Email delivery of notifications
- Protocol revision/resubmission workflow
- Advanced analytics and reporting dashboards
- Batch protocol import/export
- API access for third-party research systems
- Two-factor authentication (2FA)

---

## 6. Detailed Use Cases & Workflows

---

### 6.1 Authentication Module

#### UC-AUTH-01: User Registration

**Actor:** Guest  
**Precondition:** User has not registered before.  
**Trigger:** User clicks "Get Started" or navigates to `/sign-up`.

**Main Flow:**
1. User arrives at the Sign Up page (`/sign-up`).
2. User enters their **full name**, **email address**, and **password**.
3. User optionally enters additional profile fields (profession, title, gender).
4. User submits the form.
5. System validates inputs:
   - Email must be unique and valid format.
   - Password must meet minimum security requirements.
   - Name must not be empty.
6. System creates a new `User` record with `role = null` (treated as regular user), `emailVerified = false`.
7. System creates an `Account` record linked to the user (email/password provider).
8. System creates a `Session` and sets an authentication cookie.
9. User is redirected to the home feed (`/`) with authenticated access.

**Alternative Flow (Email Already Registered):**
- Step 5 validation fails: system displays "Email already in use" error.
- User is prompted to sign in or reset their password.

**Post-condition:** New user account exists in the database; user is authenticated.

---

#### UC-AUTH-02: User Sign-In

**Actor:** Registered User, Admin, Superadmin  
**Precondition:** User has a registered account.  
**Trigger:** User clicks "Sign In" or navigates to `/sign-in`.

**Main Flow:**
1. User arrives at the Sign In page (`/sign-in`).
2. User enters their **email address** and **password**.
3. System validates credentials against stored (hashed) password.
4. On success, system creates a new `Session` record with an expiry timestamp.
5. Session cookie is set in the browser.
6. System checks the user's `banned` flag; if `true`, denies access and shows ban reason.
7. User is redirected to the home feed (`/`) or the page they originally requested.

**Alternative Flow (Wrong Credentials):**
- System displays "Invalid email or password" error. No session is created.

**Alternative Flow (Banned User):**
- System displays "Your account has been suspended: [reason]" and denies access.

**Post-condition:** A valid session exists; the user can access all authenticated routes.

---

#### UC-AUTH-03: Password Reset Request

**Actor:** Registered User  
**Precondition:** User has a registered account but has forgotten their password.  
**Trigger:** User clicks "Forgot Password?" on the sign-in page, navigating to `/request-password`.

**Main Flow:**
1. User enters their registered **email address**.
2. System validates that the email exists in the database.
3. System creates a `Verification` token record with an expiry.
4. System dispatches a password-reset email containing a unique reset link.
5. User receives the email and clicks the reset link, navigating to `/reset-password?token=<token>`.
6. User enters and confirms a new password.
7. System validates the token (not expired, not used).
8. System updates the hashed password in the `Account` record.
9. System invalidates all existing sessions for that user.
10. User is redirected to `/sign-in` with a success message.

**Alternative Flow (Token Expired):**
- System displays "Reset link has expired. Please request a new one."

---

#### UC-AUTH-04: Sign Out

**Actor:** Any authenticated user  
**Trigger:** User clicks "Sign Out" in the user menu.

**Main Flow:**
1. System deletes the current `Session` record from the database.
2. Session cookie is cleared.
3. User is redirected to the home page (`/`) as a guest.

---

### 6.2 Public Home / Feed

#### UC-PUBLIC-01: Browse Public Feed (Guest)

**Actor:** Guest  
**Precondition:** None.

**Main Flow:**
1. Guest navigates to `/` (home page).
2. System detects no authenticated session.
3. System fetches the most recent 20 published posts using `getPublicPosts()`.
4. Page renders with:
   - **Navbar** (logo, navigation links to public pages, Sign In / Get Started buttons).
   - **Left Sidebar:** Guest view with "Sign up to join" prompt and navigation links (About, Accessibility, Help Center, Privacy/Terms).
   - **Main Feed Column:** Read-only list of posts (no ability to like, comment, or post).
   - **Right Sidebar (desktop):** Trending tags panel, Protocol Tracker widget.
   - **Mobile:** Hero banner with "Welcome to CNERSH" and registration/sign-in buttons; Protocol Tracker below the feed.
5. Guest can click "Sign In" or "Get Started" from the navbar or mobile hero banner.

**Post-condition:** Guest sees the latest community posts without interaction capabilities.

---

#### UC-PUBLIC-02: Track Protocol by Code (Guest or User)

**Actor:** Guest or Registered User  
**Trigger:** User enters a tracking code in the Protocol Tracker widget (right sidebar or mobile section).

**Main Flow:**
1. User types a **Tracking Code** in the Protocol Tracker input field and clicks "Track".
2. System calls `trackProjectByCode(code)` which queries the `Project` table.
3. If a matching project is found, the widget displays:
   - Protocol title
   - Current status badge (DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED)
   - Category
   - Submission date
   - Last updated date
   - Most recent feedback (if available)
4. The result updates in place without a page reload.

**Alternative Flow (Code Not Found):**
- Widget displays "No protocol found for this tracking code."

---

### 6.3 Dashboard

#### UC-DASH-01: View User Dashboard

**Actor:** Registered User  
**Trigger:** User navigates to `/dashboard`.

**Main Flow:**
1. System verifies the session and fetches user-specific data via `getUserDashboardData()`.
2. Dashboard renders with:
   - **Welcome banner** with user name and profile picture.
   - **Statistics cards:**
     - Total protocols submitted
     - Protocols pending review
     - Protocols approved
     - Protocols rejected
   - **My Recent Protocols** — a list of the user's 5 most recently submitted protocols with status badges and "View" links.
   - **Recent Community Topics** — the 5 most recent community discussion topics.
   - **Quick Action buttons** — "Submit New Protocol", "View All My Protocols", "Visit Community".
3. Left sidebar (all roles) shows navigation links: Dashboard, Feeds, Protocols, Notifications, Settings.

---

#### UC-DASH-02: View Admin Dashboard

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin`.

**Main Flow:**
1. System verifies the session and checks admin/superadmin role.
2. Dashboard fetches data via `getAdminDashboardData()` and `getAdminStats()`.
3. Admin dashboard renders with:
   - **Summary stat cards:**
     - Total users registered
     - Total protocols submitted
     - Protocols pending review
     - Active community topics
   - **Admin-specific charts** (`AdminCharts` component):
     - Protocol status distribution (pie/bar chart)
     - User registration trend (line/bar chart)
   - **Recent activity panel** — latest audit log entries.
   - **System health panel** — database record counts.
4. Admin sidebar shows additional sections:
   - **Admin:** Protocol Review, Community Moderation, Feed Moderation, User Management, Audit Logs, Reports, Pages.
   - **Analytics:** Admin dashboard overview.
5. Superadmins see the same view plus access to all user management actions (including admin accounts).

---

### 6.4 Protocol Submission (Research Ethics Review)

This is the core workflow of the application. A research protocol is submitted in a 17-step form wizard.

#### UC-PROTO-01: Submit a New Protocol

**Actor:** Registered User  
**Precondition:** User is authenticated.  
**Trigger:** User clicks "Submit New Protocol" on the dashboard or navigates to `/protocols/submit`.

**Main Flow — 17-Step Wizard:**

| Step | Section Title | Key Fields |
|------|---------------|------------|
| 1 | Protocol Info | Protocol Title, Study Type (select from: Public Health, Clinical Medicine, Biomedical Sciences, Nursing Sciences, Pharmacology, Epidemiology, Social Sciences & Health, Traditional Medicine, Mental Health, Environmental Health, Reproductive Health, Nutrition, Other), Research Field, Project Description |
| 2 | Principal Investigator | Full Name, Institution, Address, Telephone, Email, Qualification, Experience, CV upload |
| 3 | Co-Investigators | List of co-investigators (Name, Institution, Email, Role, CV upload) — can add/remove |
| 4 | Sponsor / Funding | Sponsor Name, Sponsor Address, Sponsor Country, Funding Source Type (Government/Private/International/Self-Funded/Mixed), Funding Amount, Funding Document upload |
| 5 | Study Summary | Summary in English (required), Summary in French (required — bilingual requirement) |
| 6 | Research Background | Detailed background narrative |
| 7 | Research Question | Main research question, Hypothesis |
| 8 | Objectives | General objective, Specific objectives (add multiple) |
| 9 | Literature Review | Narrative literature review text |
| 10 | Methodology | Study Type, Study Location, Study Start Date, Study End Date, Target Population, Sample Size, Sampling Method (8 options + Other), Inclusion Criteria, Exclusion Criteria, Data Collection Methods, Data Analysis Plan |
| 11 | Ethics | Participant Protection measures, Confidentiality Measures, Potential Risks, Expected Benefits, Compensation plan |
| 12 | Consent Documents | Information Sheet (French upload), Information Sheet (English upload), Consent Form (French upload), Consent Form (English upload) |
| 13 | Data Collection Tools | Upload data collection instruments document |
| 14 | Budget | Upload detailed budget document |
| 15 | Institutional Authorization | Upload letter of authorisation from the researcher's institution |
| 16 | Additional Documents (Conditional) | Investigator's Brochure, Participant Insurance, Protocol Error Insurance, End-of-Trial Agreement, Foreign Ethics Approval, Material Transfer Agreement, Data Sharing Agreement — all optional/conditional |
| 17 | Payment Proof | Upload proof of payment of review fee |
| 18 | Review & Submit | Summary review of all entered data before final submission |

**Auto-Save Behaviour:**
- Draft data is automatically saved to the browser's `localStorage` under the key `cnersh-protocol-draft` every 30 seconds.
- On returning to the form, the system detects the saved draft and prompts the user to restore it or start fresh.
- Draft data is cleared from localStorage upon successful submission.

**Form Navigation:**
- User can navigate forward/backward between steps using "Next" and "Back" buttons.
- Progress indicator shows the current step number and title out of 18.
- Validation is applied per step before advancing.

**On Final Submission (Step 18 — Submit):**
1. User clicks "Submit Protocol."
2. System calls `submitProject(data)` server action.
3. System validates all required fields.
4. System generates a unique **Tracking Code** (e.g., `CNERSH-XXXXXXXX`).
5. System creates a `Project` record with:
   - `status = SUBMITTED`
   - All form fields serialised into `formData` (JSON)
   - `trackingCode` assigned
6. System creates an initial `ProjectStatusHistory` entry (status = SUBMITTED, changedBy = userId).
7. System creates `Notification` records for all admin/superadmin users (type = `SYSTEM`, message = "New protocol submitted: [title]").
8. System clears the `cnersh-protocol-draft` localStorage key.
9. User is redirected to the Protocols list (`/protocols`) or a success page showing their **Tracking Code**.
10. The Tracking Code is prominently displayed for the user to copy and save.

**Post-condition:** Protocol stored in the database with `SUBMITTED` status; admins notified; user has tracking code.

---

#### UC-PROTO-02: View My Protocols

**Actor:** Registered User  
**Trigger:** User navigates to `/protocols`.

**Main Flow:**
1. System calls `getUserProjects()` which returns all non-deleted projects for the authenticated user.
2. Page displays a list/table of protocols with columns:
   - Tracking Code
   - Title
   - Category / Study Type
   - Submission Date
   - Current Status (badge: DRAFT / SUBMITTED / PENDING_REVIEW / APPROVED / REJECTED)
   - Actions: "View Details"
3. User can click "View Details" to navigate to `/protocols/[id]`.

---

#### UC-PROTO-03: View Protocol Detail

**Actor:** Registered User (own protocol), Admin/Superadmin (any protocol)  
**Trigger:** User/Admin navigates to `/protocols/[id]`.

**Main Flow:**
1. System calls `getProjectById(id)` and verifies the requesting user owns the protocol (or is an admin).
2. Page displays all protocol information:
   - Tracking Code, Title, Status badge, Submission Date, Last Updated
   - Full form data sections (PI info, methodology, ethics, etc.)
   - **Status History Timeline** — chronological list of all status changes with comments and the actor who made the change.
   - **Feedback** — any reviewer feedback attached to the protocol.
   - Assigned Reviewer name (if assigned).
3. For admins: Action buttons (Update Status, Assign Reviewer, Forward to Feed) are shown.

---

#### UC-PROTO-04: Admin — Update Protocol Status

**Actor:** Admin, Superadmin  
**Precondition:** Protocol is in a status that allows transition (not already APPROVED/REJECTED, or admin has override).  
**Trigger:** Admin is on the Protocol Review page (`/admin/protocol-review`) or the protocol detail page.

**Valid Status Transitions:**

```
DRAFT ──► SUBMITTED ──► PENDING_REVIEW ──► APPROVED
                                        └──► REJECTED
```

**Main Flow:**
1. Admin selects a protocol from the list on `/admin/protocol-review`.
2. Admin views the protocol's current status and detail.
3. Admin selects a new status from the status dropdown.
4. Admin optionally enters a **comment/feedback** for the researcher.
5. Admin clicks "Update Status."
6. System calls `updateProjectStatus(projectId, newStatus, comment)`.
7. System updates `Project.status` and `Project.feedback`.
8. System creates a new `ProjectStatusHistory` record (status, comment, changedBy = adminId).
9. System creates a `Notification` for the protocol's owner (type = `PROJECT_STATUS`, message = "Your protocol '[title]' status has been updated to [status].").
10. System creates an `AuditLog` entry recording the admin action.
11. Admin sees a success toast; the status badge updates in the UI.

**Post-condition:** Protocol status updated; researcher notified; audit trail created.

---

#### UC-PROTO-05: Admin — Assign Protocol Reviewer

**Actor:** Admin, Superadmin  
**Trigger:** Admin uses the "Assign Reviewer" action on a protocol.

**Main Flow:**
1. Admin calls up the protocol on `/admin/protocol-review`.
2. Admin clicks "Assign Reviewer."
3. System calls `getAdminUsers()` to list all admin/superadmin accounts available as reviewers.
4. Admin selects a reviewer from the dropdown.
5. Admin clicks "Assign."
6. System calls `assignProjectReviewer(projectId, adminId)`.
7. System updates `Project.assignedToId`.
8. System creates a `Notification` for the assigned reviewer (type = `REVIEW_ASSIGNED`, message = "You have been assigned to review: '[title]'.").
9. System creates an `AuditLog` entry.
10. Protocol detail page shows the reviewer's name under "Assigned Reviewer."

---

#### UC-PROTO-06: Admin — Forward Protocol to Community Feed

**Actor:** Admin, Superadmin  
**Trigger:** Admin chooses to share an approved protocol result or announcement via the community feed.

**Main Flow:**
1. Admin is on the protocol detail page.
2. Admin clicks "Forward to Feed."
3. Admin enters/edits a **post caption** and optionally attaches an image.
4. Admin clicks "Publish to Feed."
5. System calls `forwardProjectToFeed(projectId, { content, image })`.
6. System creates a new `Post` record authored by the admin.
7. The post appears in the public/authenticated feed.

---

### 6.5 Feed / Social Posts

#### UC-FEED-01: Create a Post

**Actor:** Registered User, Admin, Superadmin  
**Trigger:** User clicks the "What's on your mind?" post-creation area on the home page feed.

**Main Flow:**
1. User opens the post creation dialog/panel.
2. User types post **content** (text).
3. User optionally:
   - Attaches one or more **images** (up to 8 MB each via `/api/upload`).
   - Attaches one or more **videos** (up to 50 MB each via `/api/upload`).
   - Adds **hashtags** (parsed from content or manually added as tags array).
   - Adds a **CTA link** with a URL and link type (apply_now, visit_website, click_here, learn_more, download, register).
4. User clicks "Post."
5. System calls `createPost(data)` server action.
6. System validates content is non-empty.
7. System creates a `Post` record with the user's ID, content, media URLs, tags, link fields, and timestamps.
8. The new post appears at the top of the feed immediately (optimistic update or page refresh).

**Post-condition:** Post is visible to all users on the feed.

---

#### UC-FEED-02: View & Scroll Feed

**Actor:** Registered User  
**Trigger:** User is on the home page.

**Main Flow:**
1. System fetches initial 20 posts via `getPosts(1, 20)` ordered by `createdAt DESC`.
2. Feed renders using `FeedClient` component with infinite scroll.
3. As user scrolls to the bottom, additional posts are loaded (next page, 10 at a time).
4. Each **PostCard** displays:
   - Author avatar, name, timestamp, role badge.
   - Post text content.
   - Media (images/videos in a responsive grid/player).
   - Link preview card (if `linkUrl` is set, OG metadata is fetched via `/api/link-preview`).
   - Tags as clickable badges.
   - **Engagement Summary:** Reaction count (e.g., "12 Likes"), comment count.
   - **Like button** with reaction type selector (Like, Love, Haha, Wow, Sad, Angry).
   - **Comment button** toggle.
   - Options menu (Edit, Delete — for post owner; Delete — for admins).

---

#### UC-FEED-03: React to a Post

**Actor:** Registered User  
**Trigger:** User clicks the like/reaction button on a post.

**Main Flow:**
1. User clicks the reaction button.
2. A reaction picker (emoji) appears allowing selection of reaction type.
3. User selects a reaction (e.g., "Like", "Love").
4. System calls `toggleLike(postId, reactionType)`.
5. If user has not previously reacted: system creates a `Like` record (unique per postId + userId).
6. If user has previously reacted with the **same** reaction: system deletes the `Like` record (toggle off).
7. If user has previously reacted with a **different** reaction: system updates the `reactionType` field.
8. The reaction count updates in the UI.
9. The post owner receives a `Notification` (type = `LIKE`).

---

#### UC-FEED-04: Comment on a Post

**Actor:** Registered User  
**Trigger:** User clicks "Comment" on a post or submits the comment input.

**Main Flow:**
1. Comment section expands below the post.
2. User types comment text in the input field.
3. User clicks "Send."
4. System calls `addComment(postId, content)`.
5. System creates a `Comment` record linked to the post.
6. Comment appears in the list immediately.
7. Post author receives a `Notification` (type = `COMMENT`).

**Sub-Flow — Threaded Replies:**
- User can reply to an existing comment by clicking "Reply" on that comment.
- System calls `addComment(postId, content, parentId)` with the parent comment's ID.
- A nested `Comment` record is created with `parentId` set.
- The reply appears indented under the parent comment.

---

#### UC-FEED-05: React to a Comment

**Actor:** Registered User  
**Trigger:** User clicks the like/dislike on a comment.

**Main Flow:**
1. User clicks the like icon on a comment.
2. System calls `toggleCommentLike(commentId, isDislike, reactionType)`.
3. Like/dislike count updates on the comment.

---

#### UC-FEED-06: Edit a Post

**Actor:** Post Author  
**Trigger:** Author clicks "Edit" in the post options menu.

**Main Flow:**
1. Post content becomes editable (in-line editor opens).
2. User modifies text, adds/removes images/videos, edits tags or link URL.
3. User clicks "Save."
4. System calls `updatePost(postId, { content, images, videos, tags, linkUrl, linkType })`.
5. Post is updated in the database and the UI reflects the changes.

---

#### UC-FEED-07: Delete a Post

**Actor:** Post Author, Admin, Superadmin  
**Trigger:** User/Admin clicks "Delete" in the post options menu.

**Main Flow:**
1. A confirmation dialog appears.
2. User confirms deletion.
3. System calls `deletePost(postId)`.
4. System verifies the caller owns the post OR has admin/delete permissions.
5. System sets `Post.deleted = true` (soft delete).
6. Post is removed from the feed in the UI.

---

#### UC-FEED-08: Edit / Delete a Comment

**Actor:** Comment Author, Admin  
**Trigger:** User/Admin clicks Edit/Delete on a comment.

- **Edit:** System calls `editComment(commentId, content)` — updates the comment text.
- **Delete:** System calls `deleteComment(commentId)` — soft-deletes (`deleted = true`), collapses thread.

---

#### UC-FEED-09: Toggle Comments on a Post

**Actor:** Post Author, Admin  
**Trigger:** Post author selects "Disable Comments" from post options.

**Main Flow:**
1. System calls `togglePostComments(postId)`.
2. `Post.commentsEnabled` toggles between `true` and `false`.
3. When `commentsEnabled = false`, the comment input and "Comment" button are hidden from all viewers.

---

#### UC-FEED-10: Search/Mention Users in Post

**Actor:** Registered User  
**Trigger:** User types `@` in the post content or comment field.

**Main Flow:**
1. User types `@` followed by a name.
2. System calls `searchUsers(query)` to suggest matching users.
3. User selects a user from suggestions.
4. A mention is embedded in the content.
5. Upon post/comment creation, the mentioned user receives a `Notification` (type = `MENTION`).

---

#### UC-FEED-11: View Trending Tags

**Actor:** Any authenticated user  
**Trigger:** Feed right sidebar loads.

**Main Flow:**
1. System calls `getTrendingTags(5)` which counts tag usage across all posts.
2. Right sidebar displays the top 5 most used tags as clickable links.
3. Clicking a tag filters the feed to show only posts containing that tag.

---

### 6.6 Community Discussion

The Community module is a structured discussion forum available to admin and superadmin roles (and visible in the admin sidebar). It provides categorised topic channels with threaded chat-style replies, supporting rich media, polls, and event posts.

#### Community Categories

| Category | Badge Colour | Notes |
|----------|--------------|-------|
| Announcements | Yellow | Admin/Superadmin only (creation) |
| General | Grey | Open to all |
| Ethics | Purple | Open to all |
| Research | Blue | Open to all |
| Policy | Amber | Open to all |
| Technology | Green | Open to all |
| Health | Red | Open to all |
| Education | Indigo | Open to all |

---

#### UC-COMM-01: Create a Community Topic

**Actor:** Admin, Superadmin (all categories); Users cannot access the community section.  
**Trigger:** Admin clicks "New Topic / New Channel" on the Community page (`/community`).

**Main Flow:**
1. Admin opens the "New Topic" dialog.
2. Admin fills in:
   - **Title** (required)
   - **Content** (required — introduction/description)
   - **Category** (from the list above)
   - Optional: Image(s), Video(s), Document(s), Link URL
3. If category is "Announcements": system additionally sends a `Notification` of type `ANNOUNCEMENT` to all registered users.
4. Admin clicks "Create."
5. System calls `createTopic(data)`.
6. System creates a `CommunityTopic` record.
7. The new topic appears in the left panel of the Community page under its category.

**Alternative Flow (Regular User Attempt on Announcements):**
- System blocks with "Only admins can create announcements."

---

#### UC-COMM-02: View Community Topics & Chat

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/community`.

**Main Flow:**
1. System fetches all topics via `getTopics()` grouped by category.
2. Left panel lists all topics under their category headings.
3. Admin clicks a topic to open it in the right chat panel.
4. System calls `getTopicWithReplies(topicId)` to fetch all replies.
5. Chat panel displays:
   - Topic title, content, media, category badge.
   - Reply thread (chronological, grouped if within 5 minutes by same user).
   - Reply input at the bottom (if `chatEnabled = true`).

---

#### UC-COMM-03: Reply to a Community Topic

**Actor:** Admin, Superadmin  
**Precondition:** The topic's `chatEnabled` flag is `true`.  
**Trigger:** Admin types a message in the reply input and presses Enter or clicks Send.

**Reply Types Supported:**
| Type | Fields |
|------|--------|
| Text | Plain text content |
| Image | One or more image URLs (via `/api/upload`) |
| Video | One or more video URLs (via `/api/upload`) |
| Audio / Voice Note | Audio file URL |
| Document | Document file URL |
| Link | Link URL (rendered as link preview) |
| Poll | Poll question + options (stored as JSON votes) |
| Event | Event title, date/time, location |

**Main Flow:**
1. User composes the reply (text and/or selects a special message type).
2. User submits.
3. System calls `addReply(data)` with topicId, content, and optional media fields.
4. Reply is created and appears in the chat thread immediately.
5. Replies can be nested (parent–child) for direct sub-replies.

---

#### UC-COMM-04: Vote on a Poll

**Actor:** Admin, Superadmin (topic participant)  
**Trigger:** A reply contains a poll; user clicks a poll option.

**Main Flow:**
1. Poll options are displayed as radio buttons or clickable items.
2. User clicks their chosen option.
3. System calls `voteOnPoll(replyId, optionIndex)`.
4. Vote count for that option increments in `CommunityReply.pollVotes` (JSON map of `{ "optionIndex": count }`).
5. Results display as a percentage bar per option.

---

#### UC-COMM-05: Like / Dislike a Community Topic

**Actor:** Admin, Superadmin  
**Trigger:** User clicks the like or dislike button on a topic.

**Main Flow:**
1. System calls `toggleTopicLike(topicId, isDislike)`.
2. Like/dislike is recorded in `CommunityTopicLike` (unique per topicId + userId).
3. Like/dislike count updates in the UI.

---

#### UC-COMM-06: Edit a Community Topic

**Actor:** Topic Creator, Admin, Superadmin  
**Trigger:** User clicks "Edit" on a topic they own.

**Main Flow:**
1. Edit dialog opens pre-populated with current topic data.
2. User modifies fields.
3. System calls `editTopic(topicId, data)`.
4. Topic is updated in the database and the UI reflects changes.

---

#### UC-COMM-07: Delete a Community Topic or Reply

**Actor:** Content Author, Admin, Superadmin  
**Trigger:** User clicks "Delete" on a topic or reply.

**Main Flow:**
1. Confirmation dialog shown.
2. User confirms.
3. System calls `deleteTopic(topicId)` or `deleteReply(replyId)`.
4. System sets `deleted = true` (soft delete).
5. Content is removed from the UI.

---

#### UC-COMM-08: Toggle Chat (Enable / Disable Replies)

**Actor:** Topic Creator, Superadmin  
**Trigger:** Creator or superadmin clicks "Disable Chat" / "Enable Chat" on a topic.

**Main Flow:**
1. System calls `toggleTopicChat(topicId)`.
2. `CommunityTopic.chatEnabled` is flipped.
3. When disabled: reply input is hidden; a "Chat is disabled for this topic" notice is shown.
4. When re-enabled: reply input reappears.

---

### 6.7 Notifications

#### UC-NOTIF-01: View Notifications

**Actor:** Registered User  
**Trigger:** User clicks the notification bell in the navbar or navigates to `/notifications`.

**Main Flow:**
1. Navbar bell icon displays an unread count badge (fetched via `getUnreadNotificationCount()`).
2. User clicks the bell icon to open the notification dropdown.
3. System calls `getNotifications(1, 20)` and displays the 20 most recent notifications.
4. Each notification shows:
   - Type icon (PROJECT_STATUS, COMMENT, LIKE, MENTION, SYSTEM, ANNOUNCEMENT, REVIEW_ASSIGNED)
   - Message text
   - Timestamp (relative: "2 hours ago")
   - Read/unread visual state (unread = highlighted background)
   - Optional link to the related resource.
5. User clicks a notification to navigate to the linked resource; that notification is marked as read.

---

#### UC-NOTIF-02: Mark Notifications as Read

**Actor:** Registered User  
**Trigger:** User clicks on a notification or the "Mark all as read" button.

**Main Flow — Single:**
1. User clicks a notification item.
2. System calls `markNotificationRead(notificationId)`.
3. `Notification.read` is set to `true`.
4. Unread count badge decrements.

**Main Flow — All:**
1. User clicks "Mark all as read."
2. System calls `markAllNotificationsRead()`.
3. All unread notifications for the user are set to `read = true`.
4. Badge count drops to zero.

---

#### Notification Types & Triggers

| Notification Type | Trigger |
|-------------------|---------|
| `PROJECT_STATUS` | Admin updates a protocol's status |
| `REVIEW_ASSIGNED` | Admin assigns the user to review a protocol |
| `COMMENT` | Someone comments on the user's post |
| `LIKE` | Someone likes the user's post |
| `MENTION` | Someone @-mentions the user in a post or comment |
| `SYSTEM` | New protocol submitted (sent to admins); general system messages |
| `ANNOUNCEMENT` | Admin posts in the "Announcements" community category |

---

### 6.8 User Profile & Settings

#### UC-PROFILE-01: Update Profile

**Actor:** Registered User  
**Trigger:** User navigates to `/update-profile`.

**Main Flow:**
1. Page pre-populates with current user data.
2. User edits any combination of:
   - Full Name
   - Bio (short description)
   - Profession
   - Title (Dr., Prof., Mr., Mrs., etc.)
   - Gender (Male / Female)
   - Profile Picture (uploaded via `/api/upload`, stored as base64 or URL)
3. User clicks "Save Profile."
4. System calls `updateProfile()` server action, which retrieves the authenticated session and updates the `User` record.
5. Success toast appears; navbar avatar and name update.

---

#### UC-PROFILE-02: Change Password

**Actor:** Registered User  
**Trigger:** User navigates to `/settings` and opens the Change Password section.

**Main Flow:**
1. User enters their current password.
2. User enters and confirms a new password.
3. System validates that the current password is correct.
4. System updates the hashed password in the `Account` record.
5. All existing sessions (except the current one) are invalidated.
6. Success message is displayed.

---

#### UC-PROFILE-03: View Settings

**Actor:** Registered User  
**Trigger:** User navigates to `/settings`.

**Main Flow:**
1. Settings page loads with sections for:
   - Account security (change password)
   - Notification preferences (read-only display of notification types)
   - Theme preference (light/dark mode toggle)
   - Danger zone (account information, potential account deletion notice)

---

### 6.9 Admin Panel

#### UC-ADMIN-01: Admin Overview Dashboard

(See UC-DASH-02 above for details.)

---

#### UC-ADMIN-02: Protocol Review Queue

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/protocol-review`.

**Main Flow:**
1. System calls `getAllProjects()` which returns all non-deleted projects.
2. Admin can filter by status using dropdown filters (ALL, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED).
3. Projects are displayed in a table:
   - Tracking Code | Title | Submitter | Category | Submission Date | Status | Assigned Reviewer
4. Admin can:
   - Click a row to view full protocol detail.
   - Update status (UC-PROTO-04).
   - Assign reviewer (UC-PROTO-05).
   - Forward to feed (UC-PROTO-06).
   - Delete a protocol (`deleteProject()`).
5. All actions create `AuditLog` entries.

---

### 6.10 User Management

#### UC-USERMGMT-01: View User Management Dashboard

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/user-management`.

**Main Flow:**
1. System calls `getUserManagementData()`.
2. Page renders with:
   - **Stat cards:**
     - Total registrations (30-day trend)
     - Flagged users count
     - Pending protocols count
     - Active users (last 30 days)
   - **Recent Activity Panel** (last 10 audit log entries)
   - **System Health Panel** (DB record counts for Users, Posts, Topics, Protocols)
   - **User Table:** all users with columns (Name, Email, Role, Joined Date, Status, Actions)
3. User table supports search (by name/email) and pagination.

---

#### UC-USERMGMT-02: View User Details

**Actor:** Admin, Superadmin  
**Trigger:** Admin clicks a user row or the "View" action.

**Main Flow:**
1. Expanded panel or modal shows:
   - Profile picture, name, email, role, bio, profession.
   - Registration date, last active date.
   - Total posts, total protocols submitted.
   - Ban status and ban reason (if banned).
2. Action buttons: **Send Warning**, **Ban User**, **Change Role** (superadmin only), **Delete User** (superadmin only).

---

#### UC-USERMGMT-03: Warn a User

**Actor:** Admin, Superadmin  
**Trigger:** Admin clicks "Warn User."

**Main Flow:**
1. Admin enters a warning message.
2. Admin clicks "Send Warning."
3. System calls `sendWarning(userId, message)`.
4. System creates a `Notification` for the target user (type = `SYSTEM`, message = warning text).
5. System creates an `AuditLog` entry.

---

#### UC-USERMGMT-04: Ban a User

**Actor:** Admin (regular users only), Superadmin (any user)  
**Trigger:** Admin clicks "Ban User."

**Main Flow:**
1. Admin enters a **ban reason**.
2. Admin clicks "Confirm Ban."
3. System calls `banUserById(userId, reason)`.
4. System sets `User.banned = true`, `User.banReason = reason`.
5. System invalidates all active sessions for that user.
6. System creates an `AuditLog` entry.
7. Next sign-in attempt by the banned user is blocked with the ban reason displayed.

---

### 6.11 Content Moderation

#### UC-MOD-01: Report Content

**Actor:** Any Registered User  
**Trigger:** User clicks "Report" on a post, comment, community topic, or community reply.

**Main Flow:**
1. A report dialog opens.
2. User selects a **reason** for reporting (spam, harassment, misinformation, inappropriate, etc.).
3. User submits the report.
4. System calls `createReport(data)` with fields:
   - `reason` — the selected reason text
   - `contentType` — one of: POST, COMMENT, TOPIC, REPLY
   - `contentId` — the ID of the reported content
5. System creates a `Report` record with `status = PENDING`.
6. System creates an `AuditLog` entry.
7. User sees "Report submitted" toast.

---

#### UC-MOD-02: Admin — Review & Resolve Reports

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/reports`.

**Main Flow:**
1. System calls `getReports()` which returns all reports ordered by creation date.
2. Reports are displayed in a table with columns: Content Type, Content Preview, Reporter, Reason, Date, Status.
3. Admin can filter by status (PENDING, REVIEWED, DISMISSED).
4. Admin clicks "Review" on a report:
   - Full content is displayed for review.
   - Admin selects action: **Dismiss** (no action needed) or **Take Action** (delete content and/or ban user).
5. System calls `resolveReport(reportId, status, action)`.
6. If action = delete content: system calls `deleteReportedContent(contentType, contentId)`.
7. Report status is updated to REVIEWED or DISMISSED.
8. System creates an `AuditLog` entry.

---

#### UC-MOD-03: Admin — Feed Moderation

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/feed-moderation`.

**Main Flow:**
1. All posts are listed with author, content preview, media flag, date, and "Delete" action.
2. Admin can delete any post (calls `deletePost(postId)` which sets `deleted = true`).
3. System creates an `AuditLog` entry.

---

#### UC-MOD-04: Admin — Community Moderation

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/community-moderation`.

**Main Flow:**
1. All community topics and replies are listed.
2. Admin can delete topics (`deleteTopic(topicId)`) and replies (`deleteReply(replyId)`).
3. Admin can edit replies (`editReply(replyId, content)`).
4. System creates `AuditLog` entries for each moderation action.

---

### 6.12 Audit Logs

#### UC-AUDIT-01: View Audit Logs

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/audit-logs`.

**Main Flow:**
1. System calls `getAuditLogs(page, limit)` (paginated, 20 per page).
2. Audit log table displays:
   - Timestamp
   - Action (e.g., "PROTOCOL_STATUS_UPDATED", "USER_BANNED", "CONTENT_DELETED")
   - Details (contextual description)
   - Target ID (the affected record's ID)
   - Actor (the admin who performed the action, with their name)
3. Admin can paginate through historical records.
4. All admin actions (status updates, user bans, content deletions, role changes) generate entries automatically.

---

### 6.13 CMS Pages (Admin-Managed)

#### UC-CMS-01: Admin — Create / Manage Pages

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/admin/pages`.

**Main Flow:**
1. System fetches the page tree via `getPages()`.
2. Admin sees a hierarchical tree of `Page` records with their child `PageItem` entries.
3. Admin can create a new top-level page (name, optional parent).
4. Admin can add items to a page (Name, URL link or File URL).
5. Admin can edit or delete existing pages and items.
6. Changes are persisted via `page-actions.ts` server actions.

---

#### UC-CMS-02: Browse Dynamic Pages (Navbar)

**Actor:** Guest, Registered User  
**Trigger:** User clicks a navbar item rendered from the CMS.

**Main Flow:**
1. Navbar calls `getPages()` and renders top-level pages as dropdown menus.
2. User hovers over a top-level page to see child pages in the `PagesDropdown` component.
3. User clicks a page item to navigate to its linked URL or download its file.

---

#### UC-CMS-03: Static Public Pages

The following static routes are pre-built and do not require authentication:

| Route | Content |
|-------|---------|
| `/pages/about` | About CNERSH — mission, vision, mandate |
| `/pages/accessibility` | Accessibility statement |
| `/pages/privacy-terms` | Privacy Policy and Terms of Service |
| `/pages/contract-rex` | Contract and regulatory framework |
| `/pages/article` | Article / publication viewer |
| `/pages` | Pages index |

---

### 6.14 Support / Help Center

#### UC-SUPPORT-01: Send a Support Message

**Actor:** Registered User  
**Trigger:** User clicks "Help Center" in the left sidebar footer, which dispatches the `open-chatbox` CustomEvent.

**Main Flow:**
1. The Help chatbox panel opens (driven by `ChatBox` component listening for the `open-chatbox` event).
2. User types a support message.
3. User clicks "Send."
4. System calls `submitSupportMessage(message)`.
5. System validates the message is non-empty. (Note: no hard server-side character cap is enforced in the current implementation; the notification preview is truncated to 200 characters but the full message is stored. A recommended limit of ≤ 2 000 characters should be enforced in a future iteration.)
6. System creates a `Notification` for all admin/superadmin users with the support message content.
7. System optionally sends an email notification to the admin team via the configured email provider.
8. User sees "Message sent" confirmation toast.

---

### 6.15 Forms Module (Admin)

#### UC-FORMS-01: Add / View Forms

**Actor:** Admin, Superadmin  
**Trigger:** Admin navigates to `/forms/add` or `/forms/view`.

The forms module provides a structured way for administrators to manage custom submission forms that may supplement the standard protocol wizard. This module is separate from the main protocol submission form.

**Main Flow (Add Form):**
1. Admin navigates to `/forms/add`.
2. Admin designs or uploads a custom form structure.
3. Form is saved and becomes available to users.

**Main Flow (View Forms):**
1. Admin navigates to `/forms/view`.
2. Admin sees all created forms and submitted responses.

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load time (first contentful paint) | < 2 seconds on standard broadband |
| Feed pagination response | < 500 ms per page |
| Protocol form auto-save | Every 30 seconds (non-blocking) |
| Link preview caching | 24 hours (server-side cache) |
| File upload (8 MB image) | < 10 seconds |

### 7.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Session-based via Better Auth; sessions stored in PostgreSQL |
| Password storage | Hashed (Better Auth default: bcrypt) |
| Session invalidation | Automatic on ban and password change |
| API route protection | All routes check `authSession()` before processing |
| Role enforcement | Role checked on every protected server action |
| CSRF protection | Better Auth built-in CSRF tokens |
| File upload validation | MIME type checked; size capped (8 MB images, 50 MB videos/documents) |
| Soft delete | Data not permanently destroyed (supports audit and recovery) |

### 7.3 Reliability

- All data-fetching server components wrap external calls in `try-catch` with safe fallback returns to prevent rendering failures.
- Database operations use Prisma's type-safe query builder, eliminating SQL injection risks.
- Session expiry is enforced at the database level via `Session.expiresAt`.

### 7.4 Usability

- Fully responsive design (mobile-first with Tailwind CSS breakpoints).
- Dark mode and Light mode supported via `theme-provider.tsx`.
- Protocol form auto-saves drafts to prevent data loss.
- Inline validation messages for all form fields.
- Toast notifications for all async operations (success and error states).
- Bilingual support: protocol summaries required in both English and French.

### 7.5 Scalability

- Database indexed on all foreign keys and frequently queried fields (`createdAt`, `userId`, `status`, `trackingCode`).
- Paginated queries on all list endpoints (feed, notifications, audit logs, reports).
- Soft-delete pattern avoids accidental data loss and supports archival queries.

### 7.6 Maintainability

- TypeScript throughout the stack for type safety and refactoring support.
- Prisma schema as the single source of truth for the database structure.
- Server Actions colocated with domain modules (`actions/feed.ts`, `actions/project.ts`, etc.).
- Component library (`shadcn/ui`) standardises UI elements.

---

## 8. Database Schema Summary

### Core Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| `User` | Registered accounts | id, email, name, role, bio, image, gender, profession, title, banned, banReason, emailVerified |
| `Session` | Active login sessions | id, userId, expiresAt, token, ipAddress, userAgent |
| `Account` | Auth provider accounts | id, userId, providerId, password (hashed), accessToken |
| `Verification` | Email/password reset tokens | id, identifier, value, expiresAt |

### Feed Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Post` | Feed posts | id, userId, content, images[], videos[], tags[], linkUrl, linkType, commentsEnabled, deleted |
| `Comment` | Post comments (threaded) | id, postId, userId, content, parentId, deleted |
| `Like` | Post reactions | id, postId, userId, reactionType |
| `CommentLike` | Comment reactions | id, commentId, userId, isDislike, reactionType |

### Protocol Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Project` | Submitted protocols | id, trackingCode, title, description, category, status (DRAFT/SUBMITTED/PENDING_REVIEW/APPROVED/REJECTED), userId, assignedToId, formData (JSON), feedback, deleted |
| `ProjectStatusHistory` | Status change audit trail | id, projectId, status, comment, changedBy, createdAt |

### Community Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| `CommunityTopic` | Discussion channels | id, userId, title, content, category, images[], videos[], documents[], linkUrl, chatEnabled, deleted |
| `CommunityReply` | Topic messages (rich media) | id, topicId, userId, content, parentId, images[], videos[], audio[], documents[], pollQuestion, pollOptions[], pollVotes (JSON), eventTitle, eventDate, eventLocation, deleted |
| `CommunityTopicLike` | Topic likes/dislikes | id, topicId, userId, isDislike |

### System Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Report` | Content reports | id, userId, contentType (POST/COMMENT/TOPIC/REPLY), contentId, reason, status (PENDING/REVIEWED/DISMISSED) |
| `Notification` | In-app alerts | id, userId, type, message, link, read |
| `AuditLog` | Admin action history | id, userId, action, details, targetId, createdAt |
| `Page` | CMS pages (hierarchical) | id, name, parentId |
| `PageItem` | CMS page content items | id, pageId, name, url, fileUrl |

### Enumerations

| Enum | Values |
|------|--------|
| `Gender` | male, female |
| `ProjectStatus` | DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED |
| `ReportTarget` | POST, COMMENT, TOPIC, REPLY |
| `ReportStatus` | PENDING, REVIEWED, DISMISSED |
| `NotificationType` | PROJECT_STATUS, REVIEW_ASSIGNED, COMMENT, LIKE, MENTION, SYSTEM, ANNOUNCEMENT |

---

## 9. External Integrations & API Endpoints

### 9.1 Internal API Routes

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/[...all]` | GET/POST | No | Better Auth handler for all authentication operations (sign-in, sign-up, sessions, password reset) |
| `/api/upload` | POST | Yes | File upload handler. Accepts `multipart/form-data` with a `file` field. Returns `{ url: string (base64 data URL), name: string }`. Size limits: images 8 MB, videos/documents 50 MB. Max duration: 60 s. |
| `/api/link-preview` | GET | No | Fetches OG metadata for a URL. Query: `?url=<encoded-url>`. Returns `{ title, description, image, domain }`. Reads first 50 KB of HTML. Response cached for 24 hours. |

### 9.2 Email Integration

- The support message system (`submitSupportMessage`) dispatches an email to the admin team.
- The password reset flow sends a reset link email to the user.
- Email provider is configured via Better Auth's email plugin (provider credentials stored as environment variables).

### 9.3 Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required for Prisma) |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the application (used by Better Auth client) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth session signing |
| `BETTER_AUTH_URL` | Base URL for Better Auth server config |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Protocol** | A research study proposal submitted to CNERSH for ethical review |
| **Tracking Code** | A unique alphanumeric code (e.g., `CNERSH-XXXXXXXX`) assigned to each submitted protocol, used for public status tracking |
| **PI** | Principal Investigator — the lead researcher responsible for the submitted protocol |
| **Soft Delete** | A deletion pattern where records are marked `deleted = true` rather than physically removed, preserving data integrity and audit trails |
| **CTA Link** | Call-to-Action link attached to a feed post with a button type (Apply Now, Visit Website, Learn More, etc.) |
| **OG Metadata** | Open Graph meta tags scraped from a webpage's `<head>` to generate a link preview card |
| **Status History** | A chronological record of all status transitions a protocol has undergone, stored in `ProjectStatusHistory` |
| **AuditLog** | An immutable record of all significant administrative actions performed in the system |
| **Community Topic** | A discussion channel within the Community module, categorised by topic type |
| **Community Reply** | A message posted within a community topic channel, supporting rich content types (text, media, poll, event) |
| **chatEnabled** | A boolean flag on a `CommunityTopic` that controls whether replies can be added to that topic |
| **Better Auth** | The open-source authentication library used to manage user sessions, accounts, and access control |
| **Prisma** | TypeScript ORM used for type-safe database queries and schema management |
