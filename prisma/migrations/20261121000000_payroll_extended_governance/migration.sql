-- AlterTable
ALTER TABLE `PayrollBatchVersion`
    ADD COLUMN `calculationEngineVersion` VARCHAR(32) NULL,
    ADD COLUMN `earningsConfigVersion` INTEGER NULL,
    ADD COLUMN `deductionConfigVersion` INTEGER NULL,
    ADD COLUMN `benefitsConfigVersion` INTEGER NULL,
    ADD COLUMN `statutoryRuleVersion` INTEGER NULL;

-- CreateTable
CREATE TABLE `PayrollConfigurationVersion` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `status` ENUM('Draft', 'PendingApproval', 'Approved', 'Active', 'Superseded', 'Rejected', 'Retired') NOT NULL DEFAULT 'Draft',
    `configuration` JSON NOT NULL,
    `applicability` JSON NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `changeReason` VARCHAR(1000) NOT NULL,
    `supportingReference` VARCHAR(512) NULL,
    `simulationImpact` JSON NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `submittedByUserId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedByUserId` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PayrollConfigurationVersion_version_key`(`version`),
    INDEX `PayrollConfigurationVersion_status_category_version_idx`(`status`, `category`, `version`),
    INDEX `PayrollConfigurationVersion_effectiveFrom_effectiveTo_idx`(`effectiveFrom`, `effectiveTo`),
    INDEX `PayrollConfigurationVersion_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollBatchTimelineEvent` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `eventType` VARCHAR(80) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(40) NULL,
    `actorName` VARCHAR(160) NULL,
    `relatedRecordReference` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `PayrollBatchTimelineEvent_batchId_version_createdAt_idx`(`batchId`, `version`, `createdAt`),
    INDEX `PayrollBatchTimelineEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollDisbursementRecord` (
    `id` VARCHAR(191) NOT NULL,
    `payrollVersionId` VARCHAR(191) NOT NULL,
    `disbursementReference` VARCHAR(191) NOT NULL,
    `status` ENUM('PendingDisbursement', 'Processing', 'PartiallyPaid', 'Paid', 'PaymentFailed') NOT NULL DEFAULT 'PendingDisbursement',
    `disbursedByUserId` VARCHAR(191) NULL,
    `disbursedAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(64) NULL,
    `notes` VARCHAR(1000) NULL,
    `failureReason` VARCHAR(1000) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PayrollDisbursementRecord_payrollVersionId_key`(`payrollVersionId`),
    UNIQUE INDEX `PayrollDisbursementRecord_disbursementReference_key`(`disbursementReference`),
    INDEX `PayrollDisbursementRecord_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PayrollConfigurationVersion` ADD CONSTRAINT `PayrollConfigurationVersion_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollConfigurationVersion` ADD CONSTRAINT `PayrollConfigurationVersion_submittedByUserId_fkey` FOREIGN KEY (`submittedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollConfigurationVersion` ADD CONSTRAINT `PayrollConfigurationVersion_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollConfigurationVersion` ADD CONSTRAINT `PayrollConfigurationVersion_rejectedByUserId_fkey` FOREIGN KEY (`rejectedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollBatchTimelineEvent` ADD CONSTRAINT `PayrollBatchTimelineEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollDisbursementRecord` ADD CONSTRAINT `PayrollDisbursementRecord_payrollVersionId_fkey` FOREIGN KEY (`payrollVersionId`) REFERENCES `PayrollBatchVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollDisbursementRecord` ADD CONSTRAINT `PayrollDisbursementRecord_disbursedByUserId_fkey` FOREIGN KEY (`disbursedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
