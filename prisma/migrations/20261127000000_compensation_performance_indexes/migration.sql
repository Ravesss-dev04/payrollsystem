CREATE INDEX `PayGrade_position_basis_status_effective_idx`
  ON `PayGrade` (`position`, `basis`, `status`, `effectiveFrom`);

CREATE INDEX `AllowancePolicy_status_eligibility_recurrence_effective_idx`
  ON `AllowancePolicy` (`status`, `eligibility`, `recurrence`, `effectiveFrom`);

CREATE INDEX `BonusProgram_status_frequency_eligibility_effective_idx`
  ON `BonusProgram` (`status`, `frequency`, `eligibility`, `effectiveFrom`);

CREATE INDEX `BonusAward_program_status_created_idx`
  ON `BonusAward` (`bonusProgramId`, `status`, `createdAt`);

CREATE INDEX `SalaryAdjustment_employee_effective_status_idx`
  ON `SalaryAdjustment` (`employeeId`, `effectiveFrom`, `status`);

CREATE INDEX `SalaryAdjustment_requester_status_requested_idx`
  ON `SalaryAdjustment` (`requestedByUserId`, `status`, `requestedAt`);
