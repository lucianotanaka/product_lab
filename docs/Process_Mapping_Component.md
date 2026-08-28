# Product Lab — Process Mapping Component

## 1. Purpose

The **Process Mapping** component records, models, and visualizes business processes directly inside Product Lab. Its goal is to prevent process knowledge from being scattered across external tools such as Visio or PowerPoint and to preserve traceability between process steps and other product artifacts.

The component should support both **AS-IS** and **TO-BE** process representations.

## 2. Core Use Cases

- Model a process discovered during interviews or workshops.
- Represent activities, decisions, waits, handoffs, subprocesses, systems, start and end events.
- Store process structure in the database rather than only as an image.
- Render an interactive process flow from persisted nodes and connections.
- Maintain AS-IS and TO-BE versions.
- Link process steps to Business Areas, Requirements, Risks, Insights, Pains, Features, and User Stories.
- Flag manual work, bottlenecks, decision points, and process durations.

## 3. Functional Scope

### 3.1 Process Header

Each process should include:

- Name
- Description
- Product
- Business Area
- Process Owner
- Version
- Type: `AS_IS` or `TO_BE`
- Status: `DRAFT`, `VALIDATED`, `APPROVED`, `ARCHIVED`
- Trigger
- Expected Outcome
- Created By / Created At
- Updated By / Updated At

### 3.2 Process Nodes

Nodes represent visual elements in the process diagram.

Recommended node types:

- `START`
- `ACTIVITY`
- `DECISION`
- `END`
- `SUBPROCESS`
- `SYSTEM`
- `WAIT`
- `HANDOFF`

Each node may contain:

- Title
- Description
- Role / Team
- Business Area
- System / Tool
- Expected Duration
- Manual / Automated indicator
- Bottleneck indicator
- X/Y coordinates for canvas rendering

### 3.3 Process Connections

Connections define the route between nodes.

Each connection should store:

- Source node
- Target node
- Label (for example `Yes`, `No`, `Approved`)
- Connection type
- Condition / rule
- Sequence order

Decision nodes may have multiple outgoing connections.

### 3.4 Relationships

A process node can be related to other Product Lab entities, such as:

- Requirement
- Feature
- User Story
- Risk
- Insight
- VPC Pain
- VPC Gain
- Research item

Example:

`Manual data consolidation` → `Pain: High rework` → `Requirement: Automate consolidation` → `Feature: Automated ingestion`

## 4. Suggested Screens

### Process List

Columns:

- Process
- Business Area
- Type
- Version
- Status
- Owner
- Last Update

### Process Editor

Main areas:

- Left toolbox with node types
- Central canvas
- Right properties panel
- Relationship panel
- Version selector
- AS-IS / TO-BE selector

### Traceability View

Displays relationships from process nodes to other artifacts.

## 5. Database Model

Primary tables:

- `tbProcess`
- `tbProcessNode`
- `tbProcessEdge`
- `tbProcessNodeRelation`

## 6. Business Rules

1. Every node belongs to exactly one process.
2. Every edge belongs to exactly one process.
3. Source and target nodes of an edge must belong to the same process.
4. A `DECISION` node may have multiple outgoing edges.
5. A process version should not be physically overwritten after approval; create a new version for material changes.
6. Archived processes remain available for historical traceability.
7. Deleting a process should be soft-delete only if referenced by requirements, research, decisions, or delivery artifacts.

## 7. MVP

The first version should include:

- Process creation and editing
- AS-IS / TO-BE type
- Activity, Decision, Start and End nodes
- Node positioning
- Connections
- Business Area association
- Basic traceability to Requirements and Features
- Version and status

Advanced BPMN semantics should be avoided in the MVP. The objective is Product Discovery and business-process understanding, not replacing specialized BPMN platforms.

## 8. Future Enhancements

- Swimlanes
- Automatic layout
- BPMN import/export
- AI-assisted flow generation from Research notes
- Bottleneck analysis
- Cycle-time calculation
- Comparison AS-IS vs TO-BE
- Process performance metrics
- Process-to-requirement coverage

