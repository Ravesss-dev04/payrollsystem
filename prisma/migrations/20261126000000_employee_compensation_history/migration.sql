CREATE TABLE `EmployeeCompensationRecord` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `basis` ENUM('Monthly','Daily','Hourly') NOT NULL,
  `basePay` DECIMAL(19,4) NOT NULL,
  `effectiveFrom` DATE NOT NULL,
  `effectiveTo` DATE NULL,
  `sourceType` VARCHAR(40) NOT NULL,
  `sourceAdjustmentId` VARCHAR(191) NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `EmployeeCompensationRecord_employee_effective_key` (`employeeId`,`effectiveFrom`),
  INDEX `EmployeeCompensationRecord_employee_dates_idx` (`employeeId`,`effectiveTo`,`effectiveFrom`),
  INDEX `EmployeeCompensationRecord_sourceAdjustment_idx` (`sourceAdjustmentId`),
  CONSTRAINT `EmployeeCompensationRecord_employee_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `EmployeeCompensationRecord_creator_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
