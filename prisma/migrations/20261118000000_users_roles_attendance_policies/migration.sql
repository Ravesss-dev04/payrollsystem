-- AlterTable
ALTER TABLE `User` ADD COLUMN `phoneNumber` VARCHAR(32) NULL,
    ADD COLUMN `profileImageContentType` VARCHAR(64) NULL,
    ADD COLUMN `profileImageKey` VARCHAR(512) NULL,
    MODIFY `role` ENUM('admin', 'hr', 'tl', 'employee') NOT NULL;

-- AlterTable
ALTER TABLE `DomainAuditEvent` ADD COLUMN `details` JSON NULL,
    MODIFY `actorRole` ENUM('admin', 'hr', 'tl', 'employee') NOT NULL;

-- CreateTable
CREATE TABLE `RolePermission` (
    `role` ENUM('admin', 'hr', 'tl', 'employee') NOT NULL,
    `permission` VARCHAR(80) NOT NULL,
    `updatedByUserId` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RolePermission_updatedByUserId_idx`(`updatedByUserId`),
    PRIMARY KEY (`role`, `permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPermissionDenial` (
    `userId` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(80) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserPermissionDenial_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`userId`, `permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'hr', 'tl', 'employee') NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `activeUserId` VARCHAR(191) NULL,
    `status` ENUM('Pending', 'Sent', 'Failed', 'Accepted', 'Revoked', 'Expired') NOT NULL DEFAULT 'Pending',
    `message` VARCHAR(1000) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserInvitation_tokenHash_key`(`tokenHash`),
    UNIQUE INDEX `UserInvitation_activeUserId_key`(`activeUserId`),
    INDEX `UserInvitation_employeeId_status_expiresAt_idx`(`employeeId`, `status`, `expiresAt`),
    INDEX `UserInvitation_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendancePolicy` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `status` ENUM('Active', 'Paused', 'Archived') NOT NULL DEFAULT 'Active',
    `scope` ENUM('AllEmployees', 'Departments', 'Employees') NOT NULL,
    `precedence` INTEGER NOT NULL DEFAULT 100,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `scheduleType` ENUM('Fixed', 'Flexible') NOT NULL,
    `timeZone` VARCHAR(64) NOT NULL,
    `workDays` JSON NOT NULL,
    `shiftStart` VARCHAR(5) NULL,
    `shiftEnd` VARCHAR(5) NULL,
    `breakStart` VARCHAR(5) NULL,
    `breakEnd` VARCHAR(5) NULL,
    `breakPaid` BOOLEAN NOT NULL DEFAULT false,
    `gracePeriodMinutes` INTEGER NOT NULL DEFAULT 0,
    `missingTimeInRule` VARCHAR(120) NOT NULL,
    `missingTimeOutRule` VARCHAR(120) NOT NULL,
    `earlyOutRule` VARCHAR(120) NOT NULL,
    `undertimeRule` VARCHAR(120) NOT NULL,
    `absenceRule` VARCHAR(120) NOT NULL,
    `correctionsRequireApproval` BOOLEAN NOT NULL DEFAULT true,
    `overtimeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `overtimePriorApproval` BOOLEAN NOT NULL DEFAULT true,
    `overtimeMinimumMinutes` INTEGER NULL,
    `overtimeRoundingMinutes` INTEGER NULL,
    `overtimeMaximumMinutes` INTEGER NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `updatedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AttendancePolicy_code_key`(`code`),
    UNIQUE INDEX `AttendancePolicy_name_key`(`name`),
    INDEX `AttendancePolicy_status_effectiveFrom_effectiveTo_idx`(`status`, `effectiveFrom`, `effectiveTo`),
    INDEX `AttendancePolicy_scope_precedence_status_idx`(`scope`, `precedence`, `status`),
    INDEX `AttendancePolicy_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendancePolicyDepartment` (
    `policyId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `assignedByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendancePolicyDepartment_departmentId_policyId_idx`(`departmentId`, `policyId`),
    INDEX `AttendancePolicyDepartment_assignedByUserId_createdAt_idx`(`assignedByUserId`, `createdAt`),
    PRIMARY KEY (`policyId`, `departmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendancePolicyEmployee` (
    `policyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `assignedByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendancePolicyEmployee_employeeId_policyId_idx`(`employeeId`, `policyId`),
    INDEX `AttendancePolicyEmployee_assignedByUserId_createdAt_idx`(`assignedByUserId`, `createdAt`),
    PRIMARY KEY (`policyId`, `employeeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPermissionDenial` ADD CONSTRAINT `UserPermissionDenial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPermissionDenial` ADD CONSTRAINT `UserPermissionDenial_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInvitation` ADD CONSTRAINT `UserInvitation_activeUserId_fkey` FOREIGN KEY (`activeUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInvitation` ADD CONSTRAINT `UserInvitation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInvitation` ADD CONSTRAINT `UserInvitation_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInvitation` ADD CONSTRAINT `UserInvitation_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicy` ADD CONSTRAINT `AttendancePolicy_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicy` ADD CONSTRAINT `AttendancePolicy_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyDepartment` ADD CONSTRAINT `AttendancePolicyDepartment_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `AttendancePolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyDepartment` ADD CONSTRAINT `AttendancePolicyDepartment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyDepartment` ADD CONSTRAINT `AttendancePolicyDepartment_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyEmployee` ADD CONSTRAINT `AttendancePolicyEmployee_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `AttendancePolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyEmployee` ADD CONSTRAINT `AttendancePolicyEmployee_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendancePolicyEmployee` ADD CONSTRAINT `AttendancePolicyEmployee_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `RolePermission` (`role`, `permission`, `updatedAt`) VALUES
    ('admin', 'dashboard:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'company:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'company:manage', CURRENT_TIMESTAMP(3)),
    ('admin', 'users:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'users:manage', CURRENT_TIMESTAMP(3)),
    ('admin', 'employees:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'payroll:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'payroll:approve', CURRENT_TIMESTAMP(3)),
    ('admin', 'payslip:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'attendance:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'attendance:manage', CURRENT_TIMESTAMP(3)),
    ('admin', 'leave:read', CURRENT_TIMESTAMP(3)),
    ('admin', 'leave:manage', CURRENT_TIMESTAMP(3)),
    ('admin', 'reports:read', CURRENT_TIMESTAMP(3)),
    ('hr', 'employees:read', CURRENT_TIMESTAMP(3)),
    ('hr', 'employees:manage', CURRENT_TIMESTAMP(3)),
    ('hr', 'attendance:read', CURRENT_TIMESTAMP(3)),
    ('hr', 'attendance:manage', CURRENT_TIMESTAMP(3)),
    ('hr', 'leave:read', CURRENT_TIMESTAMP(3)),
    ('hr', 'leave:manage', CURRENT_TIMESTAMP(3)),
    ('employee', 'employees:read', CURRENT_TIMESTAMP(3)),
    ('employee', 'payslip:read', CURRENT_TIMESTAMP(3)),
    ('employee', 'attendance:read', CURRENT_TIMESTAMP(3)),
    ('employee', 'leave:read', CURRENT_TIMESTAMP(3)),
    ('employee', 'leave:request', CURRENT_TIMESTAMP(3));

