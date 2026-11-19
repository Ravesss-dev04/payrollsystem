CREATE TABLE `PayrollRuleSet` (
    `id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `configuration` JSON NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PayrollRuleSet_version_key`(`version`),
    INDEX `PayrollRuleSet_effectiveFrom_version_idx`(`effectiveFrom`, `version`),
    INDEX `PayrollRuleSet_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PayrollRuleSet`
    ADD CONSTRAINT `PayrollRuleSet_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
