CREATE TABLE `PayrollBatch` (
    `id` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(64) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PayrollBatch_batchNumber_key`(`batchNumber`),
    INDEX `PayrollBatch_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollBatchVersion` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('Draft', 'HRVerified', 'PendingAdminApproval', 'Approved', 'Rejected', 'Returned', 'Processing', 'Processed') NOT NULL DEFAULT 'Draft',
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `cutoffReference` VARCHAR(160) NOT NULL,
    `currencyCode` CHAR(3) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    `sourceCalculatedAt` DATETIME(3) NULL,
    `preparedByUserId` VARCHAR(191) NOT NULL,
    `preparedByNameSnapshot` VARCHAR(191) NULL,
    `submittedByUserId` VARCHAR(191) NULL,
    `submittedByNameSnapshot` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `organizationNameSnapshot` VARCHAR(160) NULL,
    `timeZoneSnapshot` VARCHAR(64) NULL,
    `deductionCategorySetVersion` INTEGER NULL,
    `employeeCount` INTEGER NOT NULL,
    `grossPayable` DECIMAL(19, 4) NOT NULL,
    `totalDeductions` DECIMAL(19, 4) NOT NULL,
    `netPayable` DECIMAL(19, 4) NOT NULL,
    `employerContributions` DECIMAL(19, 4) NULL,
    `laborCost` DECIMAL(19, 4) NULL,
    `overtimeCost` DECIMAL(19, 4) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PayrollBatchVersion_batchId_version_key`(`batchId`, `version`),
    INDEX `PayrollBatchVersion_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `PayrollBatchVersion_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    INDEX `PayrollBatchVersion_preparedByUserId_createdAt_idx`(`preparedByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollEmployeeResult` (
    `id` VARCHAR(191) NOT NULL,
    `payrollVersionId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `employeeReference` VARCHAR(191) NOT NULL,
    `employeeNumber` VARCHAR(64) NOT NULL,
    `employeeName` VARCHAR(160) NOT NULL,
    `department` VARCHAR(120) NOT NULL,
    `position` VARCHAR(120) NULL,
    `compensationBasis` VARCHAR(32) NOT NULL,
    `applicableRate` DECIMAL(19, 4) NOT NULL,
    `daysWorked` DECIMAL(9, 4) NULL,
    `regularHours` DECIMAL(9, 4) NULL,
    `overtimeHours` DECIMAL(9, 4) NULL,
    `grossPay` DECIMAL(19, 4) NOT NULL,
    `totalDeductions` DECIMAL(19, 4) NOT NULL,
    `netPay` DECIMAL(19, 4) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    UNIQUE INDEX `PayrollEmployeeResult_payrollVersionId_employeeId_key`(`payrollVersionId`, `employeeId`),
    UNIQUE INDEX `PayrollEmployeeResult_payrollVersionId_employeeReference_key`(`payrollVersionId`, `employeeReference`),
    UNIQUE INDEX `PayrollEmployeeResult_payrollVersionId_employeeNumber_key`(`payrollVersionId`, `employeeNumber`),
    INDEX `PayrollEmployeeResult_employeeId_payrollVersionId_idx`(`employeeId`, `payrollVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollEarningLine` (
    `id` VARCHAR(191) NOT NULL,
    `employeeResultId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    INDEX `PayrollEarningLine_employeeResultId_category_idx`(`employeeResultId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollDeductionLine` (
    `id` VARCHAR(191) NOT NULL,
    `employeeResultId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    INDEX `PayrollDeductionLine_employeeResultId_category_idx`(`employeeResultId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollAttendanceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `employeeResultId` VARCHAR(191) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    `workDate` DATE NOT NULL,
    `timeIn` DATETIME(3) NULL,
    `timeOut` DATETIME(3) NULL,
    `totalHours` DECIMAL(9, 4) NULL,
    `regularHours` DECIMAL(9, 4) NULL,
    `overtimeHours` DECIMAL(9, 4) NULL,
    `nightDifferentialHours` DECIMAL(9, 4) NULL,
    `classification` VARCHAR(80) NULL,
    `approvalStatus` VARCHAR(40) NULL,
    `exceptionDetails` VARCHAR(1000) NULL,
    UNIQUE INDEX `PayrollAttendance_result_source_key`(`employeeResultId`, `sourceReference`),
    INDEX `PayrollAttendanceRecord_employeeResultId_workDate_idx`(`employeeResultId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollAdjustmentEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `employeeResultId` VARCHAR(191) NOT NULL,
    `adjustmentReference` VARCHAR(191) NOT NULL,
    `sourceReference` VARCHAR(512) NOT NULL,
    `adjustmentType` VARCHAR(80) NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `requestedBy` VARCHAR(160) NOT NULL,
    `approvedBy` VARCHAR(160) NULL,
    `approvedAt` DATETIME(3) NULL,
    `status` VARCHAR(40) NOT NULL,
    UNIQUE INDEX `PayrollAdjustment_result_ref_key`(`employeeResultId`, `adjustmentReference`),
    INDEX `PayrollAdjustmentEvidence_employeeResultId_status_idx`(`employeeResultId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollValidationException` (
    `id` VARCHAR(191) NOT NULL,
    `payrollVersionId` VARCHAR(191) NOT NULL,
    `employeeResultId` VARCHAR(191) NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `severity` ENUM('Critical', 'High', 'Warning', 'Info') NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` VARCHAR(2000) NOT NULL,
    `field` VARCHAR(120) NULL,
    `actualValue` VARCHAR(1000) NULL,
    `expectedValue` VARCHAR(1000) NULL,
    `sourceReference` VARCHAR(512) NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `resolutionDetails` VARCHAR(1000) NULL,
    UNIQUE INDEX `PayrollValidationException_payrollVersionId_fingerprint_key`(`payrollVersionId`, `fingerprint`),
    INDEX `PayrollException_version_state_idx`(`payrollVersionId`, `resolvedAt`, `severity`, `detectedAt`),
    INDEX `PayrollValidationException_employeeResultId_detectedAt_idx`(`employeeResultId`, `detectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollDecision` (
    `id` VARCHAR(191) NOT NULL,
    `payrollVersionId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `decision` ENUM('Approved', 'Rejected', 'Returned') NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PayrollDecision_payrollVersionId_key`(`payrollVersionId`),
    INDEX `PayrollDecision_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollDeductionCategorySet` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('Draft', 'Active', 'Superseded') NOT NULL DEFAULT 'Draft',
    `categories` JSON NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PayrollDeductionCategorySet_version_key`(`version`),
    INDEX `PayrollDeductionCategorySet_status_version_idx`(`status`, `version`),
    INDEX `PayrollDeductionCategorySet_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PayrollDeductionCategorySet`
    (`id`, `version`, `status`, `categories`)
VALUES
    ('payroll-deduction-category-set-v1', 1, 'Draft',
     JSON_ARRAY('SSS', 'PhilHealth', 'PagIBIG', 'WithholdingTax', 'AuthorizedOther', 'Other'));

ALTER TABLE `PayrollBatch` ADD CONSTRAINT `PayrollBatch_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollBatchVersion` ADD CONSTRAINT `PayrollBatchVersion_batchId_fkey`
    FOREIGN KEY (`batchId`) REFERENCES `PayrollBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollBatchVersion` ADD CONSTRAINT `PayrollBatchVersion_preparedByUserId_fkey`
    FOREIGN KEY (`preparedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollBatchVersion` ADD CONSTRAINT `PayrollBatchVersion_submittedByUserId_fkey`
    FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollBatchVersion` ADD CONSTRAINT `PayrollBatchVersion_deductionCategorySetVersion_fkey`
    FOREIGN KEY (`deductionCategorySetVersion`) REFERENCES `PayrollDeductionCategorySet`(`version`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollDeductionCategorySet` ADD CONSTRAINT `PayrollDeductionCategorySet_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PayrollDeductionCategorySet` ADD CONSTRAINT `PayrollDeductionCategorySet_approvedByUserId_fkey`
    FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PayrollEmployeeResult` ADD CONSTRAINT `PayrollEmployeeResult_payrollVersionId_fkey`
    FOREIGN KEY (`payrollVersionId`) REFERENCES `PayrollBatchVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollEmployeeResult` ADD CONSTRAINT `PayrollEmployeeResult_employeeId_fkey`
    FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollEarningLine` ADD CONSTRAINT `PayrollEarningLine_employeeResultId_fkey`
    FOREIGN KEY (`employeeResultId`) REFERENCES `PayrollEmployeeResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollDeductionLine` ADD CONSTRAINT `PayrollDeductionLine_employeeResultId_fkey`
    FOREIGN KEY (`employeeResultId`) REFERENCES `PayrollEmployeeResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollAttendanceRecord` ADD CONSTRAINT `PayrollAttendanceRecord_employeeResultId_fkey`
    FOREIGN KEY (`employeeResultId`) REFERENCES `PayrollEmployeeResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollAdjustmentEvidence` ADD CONSTRAINT `PayrollAdjustmentEvidence_employeeResultId_fkey`
    FOREIGN KEY (`employeeResultId`) REFERENCES `PayrollEmployeeResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollValidationException` ADD CONSTRAINT `PayrollValidationException_payrollVersionId_fkey`
    FOREIGN KEY (`payrollVersionId`) REFERENCES `PayrollBatchVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollValidationException` ADD CONSTRAINT `PayrollValidationException_employeeResultId_fkey`
    FOREIGN KEY (`employeeResultId`) REFERENCES `PayrollEmployeeResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollDecision` ADD CONSTRAINT `PayrollDecision_payrollVersionId_fkey`
    FOREIGN KEY (`payrollVersionId`) REFERENCES `PayrollBatchVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollDecision` ADD CONSTRAINT `PayrollDecision_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
