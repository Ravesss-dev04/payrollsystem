ALTER TABLE `BonusProgram`
  ADD COLUMN `code` VARCHAR(40) NULL,
  ADD COLUMN `targetData` JSON NULL,
  ADD COLUMN `notes` VARCHAR(1000) NULL,
  ADD COLUMN `pausedAt` DATETIME(3) NULL;

UPDATE `BonusProgram`
SET `code` = CONCAT('BONUS_', SUBSTRING(`id`, 1, 34))
WHERE `code` IS NULL;

ALTER TABLE `BonusProgram`
  MODIFY COLUMN `code` VARCHAR(40) NOT NULL,
  ADD UNIQUE INDEX `BonusProgram_code_key` (`code`);

ALTER TABLE `BonusAward`
  ADD COLUMN `calculationBasis` VARCHAR(200) NULL,
  ADD COLUMN `supportingReference` VARCHAR(512) NULL,
  ADD COLUMN `payrollInclusionStatus` VARCHAR(40) NOT NULL DEFAULT 'Pending';
