ALTER TABLE `DomainAuditEvent`
  ADD COLUMN `recordVersion` INT NULL,
  ADD COLUMN `previousVersion` INT NULL,
  ADD COLUMN `reason` VARCHAR(1000) NULL,
  ADD COLUMN `effectiveDate` DATE NULL,
  ADD COLUMN `approvalStatus` VARCHAR(40) NULL,
  ADD COLUMN `affectedEmployeeId` VARCHAR(191) NULL,
  ADD COLUMN `affectedGroup` JSON NULL,
  ADD COLUMN `relatedDocumentReference` VARCHAR(512) NULL,
  ADD INDEX `DomainAuditEvent_entity_action_created_idx` (`entityType`,`action`,`createdAt`),
  ADD INDEX `DomainAuditEvent_affectedEmployee_created_idx` (`affectedEmployeeId`,`createdAt`);
