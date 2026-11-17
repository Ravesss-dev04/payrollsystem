-- CreateTable
CREATE TABLE `OrganizationSettings` (
    `id` VARCHAR(32) NOT NULL DEFAULT 'primary',
    `name` VARCHAR(160) NOT NULL,
    `timeZone` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Branch_organizationId_active_name_idx`(`organizationId`, `active`, `name`),
    UNIQUE INDEX `Branch_organizationId_name_key`(`organizationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Department_organizationId_active_name_idx`(`organizationId`, `active`, `name`),
    UNIQUE INDEX `Department_organizationId_name_key`(`organizationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_departmentId_active_name_idx`(`departmentId`, `active`, `name`),
    UNIQUE INDEX `Team_departmentId_name_key`(`departmentId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmploymentStatusPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(32) NOT NULL,
    `version` INTEGER NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmploymentStatusPolicy_organizationId_effectiveFrom_version_idx`(`organizationId`, `effectiveFrom`, `version`),
    UNIQUE INDEX `EmploymentStatusPolicy_organizationId_version_key`(`organizationId`, `version`),
    UNIQUE INDEX `EmploymentStatusPolicy_organizationId_effectiveFrom_key`(`organizationId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmploymentStatusDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `headcountEligible` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmploymentStatusDefinition_policyId_active_code_idx`(`policyId`, `active`, `code`),
    INDEX `EmploymentStatusDefinition_policyId_headcountEligible_active_idx`(`policyId`, `headcountEligible`, `active`),
    UNIQUE INDEX `EmploymentStatusDefinition_policyId_code_key`(`policyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DomainAuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `actorRole` ENUM('admin', 'hr', 'employee') NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DomainAuditEvent_createdAt_idx`(`createdAt`),
    INDEX `DomainAuditEvent_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    INDEX `DomainAuditEvent_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `OrganizationSettings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `OrganizationSettings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentStatusPolicy` ADD CONSTRAINT `EmploymentStatusPolicy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `OrganizationSettings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentStatusPolicy` ADD CONSTRAINT `EmploymentStatusPolicy_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentStatusDefinition` ADD CONSTRAINT `EmploymentStatusDefinition_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `EmploymentStatusPolicy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DomainAuditEvent` ADD CONSTRAINT `DomainAuditEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

