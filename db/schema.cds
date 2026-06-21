namespace charm.ai;

entity ChangeRequest {
  key ID          : UUID;
  title           : String(200);
  description     : String(5000);
  status          : String(20) default 'Draft';
  priority        : String(10) default 'Medium';
  riskLevel       : String(10);
  riskReason      : String(2000);
  category        : String(50);
  affectedModules : String(500);
  requestedBy     : String(100);
  assignedTo      : String(100);
  plannedDate     : Date;
  createdAt       : Timestamp;
  modifiedAt      : Timestamp;
}

entity ApprovalStep {
  key ID            : UUID;
  changeRequest     : Association to ChangeRequest;
  approver          : String(100);
  status            : String(20) default 'Pending';
  comments          : String(2000);
  decidedAt         : Timestamp;
  stepOrder         : Integer;
}

entity Transport {
  key ID            : UUID;
  changeRequest     : Association to ChangeRequest;
  transportNumber   : String(20);
  system            : String(10);
  status            : String(20);
  importedAt        : Timestamp;
}

entity RiskScore {
  key ID            : UUID;
  changeRequest     : Association to ChangeRequest;
  score             : String(10);
  reasoning         : String(5000);
  calculatedAt      : Timestamp;
}