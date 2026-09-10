# Architecture and UML

## Application structure

CNERSH uses the Next.js App Router. Server components assemble pages, client components handle interactive forms, server actions implement domain mutations, API routes handle HTTP integrations, and Prisma provides typed PostgreSQL access.

```mermaid
flowchart TB
    subgraph Presentation
      Public[Public pages]
      Dashboard[Authenticated dashboards]
      Wizard[Protocol wizard]
      Evaluation[Reviewer evaluation]
      AdminUI[Administration UI]
    end

    subgraph Application
      Actions[Server actions]
      APIs[API routes]
      AuthZ[Authentication and authorization]
      Validation[Zod and file validation]
      Transactions[Workflow transactions]
    end

    subgraph Infrastructure
      DB[(PostgreSQL)]
      Redis[(Redis)]
      Storage[UploadThing]
      Email[Resend]
      Monitoring[Sentry]
    end

    Public --> APIs
    Dashboard --> Actions
    Wizard --> Actions
    Evaluation --> Actions
    AdminUI --> Actions
    Actions --> AuthZ
    APIs --> AuthZ
    AuthZ --> Validation
    Validation --> Transactions
    Transactions --> DB
    Actions --> Redis
    APIs --> Redis
    APIs --> Storage
    Actions --> Email
    APIs --> Monitoring
```

## Domain model

The diagram shows the primary protocol-review relationships. Community and feed entities are omitted for readability.

```mermaid
classDiagram
    class User {
      +String id
      +String role
      +Boolean banned
    }
    class Project {
      +String id
      +String trackingCode
      +ProjectStatus status
      +Json formData
      +Boolean deleted
    }
    class File {
      +String id
      +String storageKey
      +String userId
    }
    class ProjectStatusHistory {
      +ProjectStatus status
      +String changedBy
    }
    class ReviewAssignment {
      +ReviewAssignmentStatus status
      +DateTime dueDate
    }
    class COIDeclaration {
      +Boolean hasCOI
      +String details
    }
    class EvaluationReport {
      +EvaluationStatus status
      +Float overallScore
      +EvaluationRecommendation recommendation
    }
    class Appeal {
      +AppealStatus status
    }
    class AARApplication {
      +AARStatus status
    }
    class SAEReport {
      +SAEEventType eventType
    }

    User "1" --> "*" Project : owns
    User "1" --> "*" File : owns
    Project "1" --> "*" ProjectStatusHistory : records
    Project "1" --> "*" ReviewAssignment : assigns
    User "1" --> "*" ReviewAssignment : reviews
    ReviewAssignment "1" --> "0..1" COIDeclaration : screens
    ReviewAssignment "1" --> "0..1" EvaluationReport : produces
    Project "1" --> "0..1" Appeal : may have
    Project "1" --> "0..1" AARApplication : may have
    Project "1" --> "*" SAEReport : may report
```

## Protocol lifecycle

Backend transition matrices are authoritative. UI controls may suggest an action, but the server validates the current state again inside the write.

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> SUBMITTED
    SUBMITTED --> RETURNED_INCOMPLETE
    SUBMITTED --> PENDING_REVIEW
    RETURNED_INCOMPLETE --> DRAFT
    PENDING_REVIEW --> UNDER_REVIEW: reviewer clears COI
    UNDER_REVIEW --> REVIEW_COMPLETE: required reports submitted
    REVIEW_COMPLETE --> SESSION_SCHEDULED
    SESSION_SCHEDULED --> APPROVED
    SESSION_SCHEDULED --> APPROVED_WITH_CONDITIONS
    SESSION_SCHEDULED --> RESUBMIT
    APPROVED --> UNDER_APPEAL
    APPROVED_WITH_CONDITIONS --> UNDER_APPEAL
    RESUBMIT --> UNDER_APPEAL
    UNDER_APPEAL --> APPEAL_RESOLVED
    APPROVED --> ARCHIVED
    APPROVED_WITH_CONDITIONS --> ARCHIVED
    APPEAL_RESOLVED --> ARCHIVED
```

## Submission sequence

```mermaid
sequenceDiagram
    actor Applicant
    participant UI as 18-step wizard
    participant Action as Project action
    participant DB as PostgreSQL
    participant Notify as Notification service

    Applicant->>UI: Enter protocol data
    UI->>Action: Save draft every 30 seconds
    Action->>DB: Validate owner and update draft
    DB-->>Action: Saved version
    Action-->>UI: Draft saved
    Applicant->>UI: Certify and submit
    UI->>Action: Submit protocol
    Action->>DB: Transaction: transition, history, audit
    Action->>Notify: Notify eligible administrators
    Action-->>UI: Tracking code and submitted state
```

## Reviewer sequence

```mermaid
sequenceDiagram
    actor Reviewer
    participant UI as Reviewer UI
    participant Action as Review actions
    participant DB as PostgreSQL

    Reviewer->>Action: Open assigned protocol
    Action->>DB: Verify active assignment
    DB-->>Action: Assignment and protocol
    Action-->>UI: Authorized protocol
    Reviewer->>Action: Submit COI declaration
    Action->>DB: Transactional COI and assignment update
    alt Conflict declared
      DB-->>UI: Assignment excluded
    else No conflict
      DB-->>UI: Evaluation access enabled
      Reviewer->>Action: Save evaluation draft
      Action->>DB: Upsert assignment-scoped draft
      Reviewer->>Action: Submit evaluation
      Action->>DB: Transaction: report, assignment, history, audit
      DB-->>UI: Evaluation submitted
    end
```

## Repository map

| Path | Responsibility |
|---|---|
| `src/app/(auth)` | Authentication pages |
| `src/app/(dashboard)` | Authenticated applicant, reviewer, and administrator pages |
| `src/app/actions` | Domain reads and mutations |
| `src/app/api` | HTTP APIs and integrations |
| `src/components` | Shared and feature UI |
| `src/lib` | Authentication, policies, validation, rate limiting, SSRF defense, and infrastructure |
| `src/emails` | Transactional email templates |
| `prisma/schema.prisma` | Data model |
| `prisma/migrations` | Production database migrations |

