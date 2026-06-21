using charm.ai as db from '../db/schema';

service ChangeService @(path:'/api') {

  entity ChangeRequests as projection on db.ChangeRequest;
  entity ApprovalSteps  as projection on db.ApprovalStep;
  entity Transports     as projection on db.Transport;
  entity RiskScores     as projection on db.RiskScore;

  action calculateRisk(
    description    : String,
    category       : String,
    affectedModules: String,
    plannedDate    : String
  ) returns {
    riskLevel      : String;
    reasoning      : String;
    recommendations: String;
  };

  action submitForApproval(changeRequestId: UUID) returns String;
  action approveChange(changeRequestId: UUID, comments: String) returns String;
  action rejectChange(changeRequestId: UUID, comments: String) returns String;
}