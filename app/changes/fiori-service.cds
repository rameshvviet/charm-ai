using ChangeService from '../../srv/change-service';

annotate ChangeService.ChangeRequests with @(
  UI: {
    SelectionFields: [status, riskLevel, priority, category],
    LineItem: [
      {Value: title, Label: 'Title'},
      {Value: status, Label: 'Status'},
      {Value: riskLevel, Label: 'Risk Level'},
      {Value: priority, Label: 'Priority'},
      {Value: category, Label: 'Category'},
      {Value: requestedBy, Label: 'Requested By'},
      {Value: plannedDate, Label: 'Planned Date'}
    ],
    HeaderInfo: {
      TypeName: 'Change Request',
      TypeNamePlural: 'Change Requests',
      Title: {Value: title},
      Description: {Value: status}
    },
    FieldGroup#Details: {
      Label: 'Details',
      Data: [
        {Value: title, Label: 'Title'},
        {Value: description, Label: 'Description'},
        {Value: category, Label: 'Category'},
        {Value: affectedModules, Label: 'Affected Modules'},
        {Value: requestedBy, Label: 'Requested By'},
        {Value: assignedTo, Label: 'Assigned To'},
        {Value: plannedDate, Label: 'Planned Date'}
      ]
    },
    FieldGroup#Risk: {
      Label: 'AI Risk Assessment',
      Data: [
        {Value: riskLevel, Label: 'Risk Level'},
        {Value: riskReason, Label: 'AI Reasoning'}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Details'},
      {$Type: 'UI.ReferenceFacet', Label: 'AI Risk Assessment', Target: '@UI.FieldGroup#Risk'}
    ]
  }
);