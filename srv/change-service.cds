using charm.ai as db from '../db/schema';

service ChangeService @(path:'/api') {

  // Core change management
  entity ChangeRequests          as projection on db.ChangeRequest;
  entity ApprovalSteps           as projection on db.ApprovalStep;

  // Admin: approval workflow config
  entity ApprovalWorkflows       as projection on db.ApprovalWorkflow;
  entity ApprovalWorkflowSteps   as projection on db.ApprovalWorkflowStep;

  // Admin: transport groups
  entity TransportGroups         as projection on db.TransportGroup;

  // System landscapes
  entity SystemLandscapes        as projection on db.SystemLandscape;
  entity SapSystems              as projection on db.SapSystem;
  entity TransportRoutes         as projection on db.TransportRoute;

  // Transport management
  entity TransportRequests       as projection on db.TransportRequest;
  entity TransportObjects        as projection on db.TransportObject;
  entity ImportLogs              as projection on db.ImportLog;
  entity TransportOfCopies       as projection on db.TransportOfCopy;

  // AI intelligence
  entity DependencyChecks        as projection on db.DependencyCheck;
  entity OverwriteConflicts      as projection on db.OverwriteConflict;
  entity RetrofitTrackers        as projection on db.RetrofitTracker;
  entity RiskScores              as projection on db.RiskScore;

  // Quality & compliance
  entity TestCases               as projection on db.TestCase;
  entity FreezeWindows           as projection on db.FreezeWindow;
  entity AuditEntries            as projection on db.AuditEntry;

  // Admin config
  entity SystemRoles             as projection on db.SystemRole;
  entity LandscapeTemplates      as projection on db.LandscapeTemplate;

  // Users
  entity Users                   as projection on db.User;
  entity CABMembers              as projection on db.CABMember;

  // SOX
  entity SOXReports              as projection on db.SOXReport;

  // AI actions
  action calculateRisk(
    description     : String,
    category        : String,
    affectedModules : String,
    plannedDate     : String
  ) returns {
    riskLevel       : String;
    reasoning       : String;
    recommendations : String;
  };

  action checkDependencies(transportId      : UUID) returns String;
  action checkOverwrites(changeRequestId    : UUID) returns String;
  action detectRetrofits(changeId           : UUID) returns String;
  action generateTestCases(changeId         : UUID) returns String;
  action generateSOXReport(
    reportType    : String,
    periodStart   : String,
    periodEnd     : String
  ) returns String;
  action createTOC(
    originalTransportId : UUID,
    targetSystemId      : UUID,
    reason              : String
  ) returns String;
  action runPreImportChecks(changeRequestId : UUID) returns String;
  action importTransport(transportId        : UUID) returns String;
  action submitForApproval(changeRequestId  : UUID) returns String;
  action approveChange(changeRequestId : UUID, comments : String) returns String;
  action rejectChange(changeRequestId  : UUID, comments : String) returns String;
  action chat(message : String, history : String) returns String;
}