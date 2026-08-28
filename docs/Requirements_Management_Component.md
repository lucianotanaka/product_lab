# Product Lab — Requirements Management Component

## 1. Purpose

The **Requirements Management** component records, classifies, traces, validates, and verifies business and solution requirements before and during delivery.

Its primary purpose is to close the gap between **Discovery** and **User Stories**, ensuring Product Lab can answer:

- Why does this requirement exist?
- Which feature addresses it?
- Does it have User Stories?
- Was it implemented?
- Was it actually verified and fulfilled?

## 2. Core Use Cases

- Register requirements originating from Research, Process Mapping, Stakeholders, Risks, VPC, or business rules.
- Classify requirements by type and priority.
- Relate one requirement to one or more Features.
- Relate one requirement to one or more User Stories.
- Track requirement lifecycle.
- Track fulfillment separately from delivery status.
- Record validation and verification evidence.
- Build a traceability matrix.

## 3. Requirement Types

Recommended initial types:

- `BUSINESS`
- `FUNCTIONAL`
- `NON_FUNCTIONAL`
- `DATA`
- `INTEGRATION`
- `SECURITY`
- `COMPLIANCE`
- `UX`

## 4. Requirement Lifecycle

Lifecycle status:

- `DRAFT`
- `PROPOSED`
- `VALIDATED`
- `APPROVED`
- `REJECTED`
- `OBSOLETE`

Fulfillment status:

- `NOT_STARTED`
- `PARTIALLY_MET`
- `MET`
- `NOT_MET`
- `NOT_APPLICABLE`

These statuses must be independent.

A completed User Story does not automatically mean the Requirement is fulfilled.

## 5. Requirement Record

Suggested fields:

- Requirement Code (`REQ-0001`)
- Title
- Description
- Product
- Business Area
- Requirement Type
- Source
- Priority
- Lifecycle Status
- Fulfillment Status
- Acceptance / Definition of Fulfillment
- Owner
- Created By / Created At
- Updated By / Updated At

## 6. Relationships

### Requirement × Feature

A Requirement may be associated with multiple Features.

Coverage types:

- `PRIMARY`
- `SUPPORTING`
- `PARTIAL`

### Requirement × User Story

A Requirement may be implemented through multiple User Stories.

Suggested attributes:

- Coverage percentage
- Coverage status
- Notes

### Generic Requirement Traceability

A Requirement may also link to:

- Research
- Insight
- Process Node
- VPC Pain
- Risk
- Decision
- Release
- Metric

## 7. Verification

Requirement verification must be explicit.

Verification types:

- `TEST`
- `USER_ACCEPTANCE`
- `DOCUMENT_REVIEW`
- `METRIC`
- `MANUAL_VALIDATION`

Results:

- `PASS`
- `PARTIAL`
- `FAIL`
- `NOT_VERIFIED`

Example:

- Requirement: `REQ-001`
- User Stories: 4
- Stories Done: 4/4
- Verification: `PASS`
- Fulfillment: `MET`

## 8. Suggested Screens

### Requirements List

Columns:

- Code
- Title
- Type
- Business Area
- Priority
- Lifecycle Status
- Fulfillment Status
- Feature Count
- User Story Count
- Last Update

### Requirement Detail

Sections:

- Overview
- Source and Context
- Features
- User Stories
- Verification
- Traceability
- History

### Traceability Matrix

Example columns:

- Requirement
- Feature
- User Story
- Story Status
- Verification
- Fulfillment

## 9. Database Model

Primary tables:

- `tbRequirement`
- `tbRequirementFeature`
- `tbRequirementUserStory`
- `tbRequirementRelation`
- `tbRequirementVerification`

## 10. Business Rules

1. Requirement Code must be unique within a product.
2. Requirement lifecycle and fulfillment are separate concepts.
3. A Requirement can exist before a Feature or User Story.
4. Deleting a Requirement with relationships should be soft-delete or blocked.
5. Fulfillment `MET` should require at least one verification result `PASS` unless explicitly overridden by an authorized user.
6. Closing all linked User Stories must not automatically set fulfillment to `MET`.
7. Requirement relationships must retain historical traceability even after Feature/User Story changes.

## 11. MVP

The first version should include:

- Requirement CRUD
- Type
- Priority
- Lifecycle Status
- Fulfillment Status
- Feature relationship
- User Story relationship
- Verification record
- Basic traceability view

## 12. Future Enhancements

- Requirement templates
- AI extraction from Research notes
- Automatic requirement suggestions from Process Mapping
- Coverage analysis
- Orphan requirement alerts
- Requirements with no User Stories
- User Stories with no Requirement
- Requirement impact analysis
- Change request workflow
- Approval workflow
- Baseline/versioning

