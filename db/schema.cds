namespace charm.ai;

// ── Core change management ──────────────────────────────

entity ChangeRequest {
  key ID              : UUID;
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

entity ApprovalStep {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  approver            : String(100);
  role                : String(50);
  status              : String(20)  default 'Pending';
  comments            : String(2000);
  decidedAt           : Timestamp;
  stepOrder           : Integer;
  dueDate             : Timestamp;
  escalatedTo         : String(100);
}

// ── System landscapes ───────────────────────────────────

entity SystemLandscape {
  key ID              : UUID;
  name                : String(100);
  description         : String(500);
  type                : String(20);
  changes             : Composition of many ChangeRequest on changes.landscape = $self;
  systems             : Composition of many SapSystem on systems.landscape = $self;
  routes              : Composition of many TransportRoute on routes.landscape = $self;
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
  isActive            : Boolean      default true;
  description         : String(500);
}

entity TransportRoute {
  key ID              : UUID;
  landscape           : Association to SystemLandscape;
  fromSystem          : Association to SapSystem;
  toSystem            : Association to SapSystem;
  routeType           : String(20);
  isActive            : Boolean      default true;
}

// ── Transport management ────────────────────────────────

entity TransportRequest {
  key ID              : UUID;
  changeRequest       : Association to ChangeRequest;
  transportNumber     : String(20);
  description         : String(500);
  owner               : String(100);
  type                : String(20);
  status              : String(20)  default 'Open';
  category            : String(20);
  targetSystem        : Association to SapSystem;
  objects             : Composition of many TransportObject on objects.transport = $self;
  importLogs          : Composition of many ImportLog on importLogs.transport = $self;
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
  aiDetected          : Boolean     default false;
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
  aiGenerated         : Boolean     default false;
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