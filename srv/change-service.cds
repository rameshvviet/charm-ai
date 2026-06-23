using charm.ai as db from '../db/schema';

service ChangeService @(path:'/api') {

  entity ChangeRequests      as projection on db.ChangeRequest;
  entity ApprovalSteps       as projection on db.ApprovalStep;
  entity SystemLandscapes    as projection on db.SystemLandscape;
  entity SapSystems          as projection on db.SapSystem;
  entity TransportRoutes     as projection on db.TransportRoute;
  entity TransportRequests   as projection on db.TransportRequest;
  entity TransportObjects    as projection on db.TransportObject;
  entity ImportLogs          as projection on db.ImportLog;
  entity TransportOfCopies   as projection on db.TransportOfCopy;
  entity DependencyChecks    as projection on db.DependencyCheck;
  entity OverwriteConflicts  as projection on db.OverwriteConflict;
  entity RetrofitTrackers    as projection on db.RetrofitTracker;
  entity RiskScores          as projection on db.RiskScore;
  entity TestCases           as projection on db.TestCase;
  entity FreezeWindows       as projection on db.FreezeWindow;
  entity AuditEntries        as projection on db.AuditEntry;
  entity SystemRoles         as projection on db.SystemRole;
  entity LandscapeTemplates  as projection on db.LandscapeTemplate;

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

  action checkDependencies(transportId   : UUID) returns String;
  action checkOverwrites(landscapeId     : UUID) returns String;
  action detectRetrofits(changeId        : UUID) returns String;
  action generateTestCases(changeId      : UUID) returns String;
  action createTOC(
    originalTransportId : UUID,
    targetSystemId      : UUID,
    reason              : String
  ) returns String;
  action submitForApproval(changeRequestId : UUID) returns String;
  action approveChange(changeRequestId : UUID, comments : String) returns String;
  action rejectChange(changeRequestId  : UUID, comments : String) returns String;
  action chat(message : String, history : String) returns String;
}