namespace charm.ai;

// ── Core change management ──────────────────────────────

entity ChangeRequest {
  key ID              : UUID;
  crNumber            : String(20);
  title               : String(200);
  description         : String(5000);
  status              : String(20)  default 'Draft';
  priority            : String(10)  default 'Medium';
  category            : String(50);
  type                : String(20)  default 'Normal';
  riskLevel           : String(10);
  riskReason          : String(2000);
  affectedModules     : String(500);
  requestedBy         : String(100);
  assignedTo          : String(100);
  plannedDate         : Date;
  businessImpact      : String(1000);
  createdAt           : Timestamp;
  modifiedAt          : Timestamp;
  landscape           : Association to SystemLandscape;
  transports          : Composition of many TransportRequest on transports.changeRequest = $self;
  approvalSteps       : Composition of many ApprovalStep on approvalSteps.changeRequest = $self;
  testCases           : Composition of many TestCase on testCases.changeRequest = $self;
  retrofits           : Composition of many RetrofitTracker on retrofits.sourceChange = $self;
}

// ── Approval workflow config (admin) ────────────────────

entity ApprovalWorkflow {
  key ID              : UUID;
  name                : String(100);
  description         : String(500);
  isActive            : Integer     default 1;
  isDefault           : Integer     default 0;
  steps               : Composition of many ApprovalWorkflowStep on steps.workflow = $self;
}

entity ApprovalWorkflowStep {
  key ID              : UUID;
  workflow            : Association to ApprovalWorkflow;
  stepOrder           : Integer;
  stepName            : String(100);
  approverRole        : String(50);
  approverEmail       : String(200);
  requiresAll         : Integer     default 0;
  slaDays             : Integer     default 2;
  isCab               : Integer     default 0;
  condition           : String(500);
}

entity ApprovalStep {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  workflowStep        : Association to ApprovalWorkflowStep;
  approver            : String(100);
  role                : String(50);
  status              : String(20)  default 'Pending';
  comments            : String(2000);
  decidedAt           : Timestamp;
  stepOrder           : Integer;
  dueDate             : Timestamp;
  escalatedTo         : String(100);
}

// ── Transport groups (admin configures) ─────────────────

entity TransportGroup {
  key ID              : UUID;
  name                : String(100);
  description         : String(500);
  landscape           : Association to SystemLandscape;
  workflow            : Association to ApprovalWorkflow;
  requiresDependencyCheck : Integer default 1;
  requiresOverwriteCheck  : Integer default 1;
  requiresTestCompletion  : Integer default 1;
  requiresCAB             : Integer default 0;
  freezeWindowEnforced    : Integer default 1;
  isActive            : Integer     default 1;
}

// ── System landscapes ───────────────────────────────────

entity SystemLandscape {
  key ID              : UUID;
  name                : String(100);
  description         : String(500);
  type                : String(20);
  systems             : Composition of many SapSystem on systems.landscape = $self;
  routes              : Composition of many TransportRoute on routes.landscape = $self;
  groups              : Composition of many TransportGroup on groups.landscape = $self;
}

entity SapSystem {
  key ID              : UUID;
  landscape           : Association to SystemLandscape;
  sid                 : String(3);
  host                : String(200);
  systemNumber        : String(2);
  client              : String(3);
  type                : String(10);
  role                : String(10);
  isActive            : Integer     default 1;
  isSandbox           : Integer     default 0;
  description         : String(500);
  sortOrder           : Integer     default 0;
  rfcDestination      : String(100);
  messageServer       : String(200);
  logonGroup          : String(32);
}

entity TransportRoute {
  key ID              : UUID;
  landscape           : Association to SystemLandscape;
  fromSystem          : Association to SapSystem;
  toSystem            : Association to SapSystem;
  routeType           : String(20);
  isActive            : Integer     default 1;
  sortOrder           : Integer     default 0;
}

// ── Transport management ────────────────────────────────

entity TransportRequest {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  transportGroup      : Association to TransportGroup;
  transportNumber     : String(20);
  description         : String(500);
  owner               : String(100);
  type                : String(20);
  status              : String(20)  default 'Open';
  category            : String(20);
  targetSystem        : Association to SapSystem;
  importSequence      : Integer     default 0;
  objects             : Composition of many TransportObject on objects.transport = $self;
  importLogs          : Composition of many ImportLog on importLogs.transport = $self;
  dependencyChecks    : Composition of many DependencyCheck on dependencyChecks.transport = $self;
  createdAt           : Timestamp;
}

entity TransportObject {
  key ID              : UUID;
  transport           : Association to TransportRequest;
  pgmid               : String(4);
  object              : String(4);
  objName             : String(120);
  lockFlag            : String(1);
  activity            : String(1);
  description         : String(200);
}

entity ImportLog {
  key ID              : UUID;
  transport           : Association to TransportRequest;
  targetSystem        : Association to SapSystem;
  returnCode          : Integer;
  status              : String(20);
  log                 : String(5000);
  importedAt          : Timestamp;
  importedBy          : String(100);
  durationSeconds     : Integer;
}

// ── Transport of Copies ─────────────────────────────────

entity TransportOfCopy {
  key ID              : UUID;
  originalTransport   : Association to TransportRequest;
  copyTransportNumber : String(20);
  targetSystem        : Association to SapSystem;
  reason              : String(500);
  status              : String(20)  default 'Pending';
  requestedBy         : String(100);
  approvedBy          : String(100);
  createdAt           : Timestamp;
  importedAt          : Timestamp;
}

// ── AI intelligence ─────────────────────────────────────

entity DependencyCheck {
  key ID              : UUID;
  transport           : Association to TransportRequest;
  status              : String(20);
  missingDependencies : String(5000);
  aiAnalysis          : String(5000);
  checkedAt           : Timestamp;
  severity            : String(10);
}

entity OverwriteConflict {
  key ID              : UUID;
  transport1          : Association to TransportRequest;
  transport2          : Association to TransportRequest;
  conflictingObject   : String(120);
  objectType          : String(4);
  severity            : String(10);
  aiRecommendation    : String(2000);
  resolvedAt          : Timestamp;
  resolution          : String(500);
  status              : String(20)  default 'Open';
}

entity RetrofitTracker {
  key ID              : UUID;
  sourceChange        : Association to ChangeRequest;
  retrofitChange      : Association to ChangeRequest;
  reason              : String(1000);
  status              : String(20)  default 'Pending';
  dueDate             : Date;
  aiDetected          : Integer     default 0;
  createdAt           : Timestamp;
}

entity RiskScore {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  score               : String(10);
  reasoning           : String(5000);
  recommendations     : String(2000);
  calculatedAt        : Timestamp;
  model               : String(50);
}

// ── Quality & compliance ────────────────────────────────

entity TestCase {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  title               : String(200);
  steps               : String(3000);
  expectedResult      : String(1000);
  actualResult        : String(1000);
  status              : String(20)  default 'Not Started';
  tester              : String(100);
  testedAt            : Timestamp;
  aiGenerated         : Integer     default 0;
  evidence            : String(500);
}

entity FreezeWindow {
  key ID              : UUID;
  landscape           : Association to SystemLandscape;
  targetSystem        : Association to SapSystem;
  name                : String(200);
  startDate           : Timestamp;
  endDate             : Timestamp;
  type                : String(20);
  reason              : String(500);
  createdBy           : String(100);
  allowEmergency      : Integer     default 0;
}

entity AuditEntry {
  key ID              : UUID;
  entityName          : String(50);
  entityId            : UUID;
  action              : String(50);
  changedBy           : String(100);
  changedAt           : Timestamp;
  oldValues           : String(5000);
  newValues           : String(5000);
  ipAddress           : String(50);
  hash                : String(64);
}

// ── Admin configuration ─────────────────────────────────

entity SystemRole {
  key ID              : UUID;
  code                : String(10);
  description         : String(100);
  allowsImport        : Integer     default 1;
  requiresApproval    : Integer     default 1;
  isFreezeEnabled     : Integer     default 0;
  sortOrder           : Integer;
}

entity LandscapeTemplate {
  key ID              : UUID;
  name                : String(100);
  description         : String(500);
  systemCount         : Integer;
  template            : String(5000);
  isDefault           : Integer     default 0;
}

// ── Users & approvers ───────────────────────────────────

entity User {
  key ID              : UUID;
  email               : String(200);
  name                : String(100);
  role                : String(20);
  isActive            : Integer     default 1;
  landscapes          : String(500);
  notifyEmail         : Integer     default 1;
  createdAt           : Timestamp;
}

entity CABMember {
  key ID              : UUID;
  user                : Association to User;
  landscape           : Association to SystemLandscape;
  isChair             : Integer     default 0;
  isActive            : Integer     default 1;
}

// ── SOX reports ─────────────────────────────────────────

entity SOXReport {
  key ID              : UUID;
  reportType          : String(50);
  periodStart         : Date;
  periodEnd           : Date;
  generatedBy         : String(100);
  generatedAt         : Timestamp;
  content             : String(5000);
  status              : String(20)  default 'Draft';
}