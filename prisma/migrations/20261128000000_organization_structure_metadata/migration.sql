ALTER TABLE `Branch`
  ADD COLUMN `code` VARCHAR(40) NULL,
  ADD COLUMN `location` VARCHAR(500) NULL,
  ADD COLUMN `description` VARCHAR(500) NULL;

ALTER TABLE `Branch`
  ADD UNIQUE INDEX `Branch_organizationId_code_key` (`organizationId`, `code`),
  ADD INDEX `Branch_organizationId_active_code_idx` (`organizationId`, `active`, `code`);

ALTER TABLE `Department`
  ADD COLUMN `branchId` VARCHAR(191) NULL,
  ADD COLUMN `code` VARCHAR(40) NULL,
  ADD COLUMN `description` VARCHAR(500) NULL;

ALTER TABLE `Department`
  ADD UNIQUE INDEX `Department_organizationId_code_key` (`organizationId`, `code`),
  ADD INDEX `Department_branchId_active_name_idx` (`branchId`, `active`, `name`),
  ADD CONSTRAINT `Department_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
