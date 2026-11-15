-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `employeeNumber` VARCHAR(64) NOT NULL,
    `firstName` VARCHAR(80) NOT NULL,
    `lastName` VARCHAR(80) NOT NULL,
    `workEmail` VARCHAR(320) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_employeeNumber_key`(`employeeNumber`),
    UNIQUE INDEX `Employee_workEmail_key`(`workEmail`),
    UNIQUE INDEX `Employee_userId_key`(`userId`),
    INDEX `Employee_lastName_firstName_idx`(`lastName`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `statusDefinitionId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmployeeAssignment_employeeId_effectiveTo_effectiveFrom_idx`(`employeeId`, `effectiveTo`, `effectiveFrom`),
    INDEX `EmployeeAssignment_departmentId_effectiveFrom_effectiveTo_idx`(`departmentId`, `effectiveFrom`, `effectiveTo`),
    INDEX `EmployeeAssignment_statusDefinitionId_effectiveFrom_effectiv_idx`(`statusDefinitionId`, `effectiveFrom`, `effectiveTo`),
    UNIQUE INDEX `EmployeeAssignment_employeeId_effectiveFrom_key`(`employeeId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAssignment` ADD CONSTRAINT `EmployeeAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAssignment` ADD CONSTRAINT `EmployeeAssignment_statusDefinitionId_fkey` FOREIGN KEY (`statusDefinitionId`) REFERENCES `EmploymentStatusDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAssignment` ADD CONSTRAINT `EmployeeAssignment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
