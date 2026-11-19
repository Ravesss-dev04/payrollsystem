"use client";

import { useState, useMemo } from "react";
import { LuChevronDown, LuInfo, LuPlus, LuTrash2, LuSave, LuTriangle, LuCheck } from "react-icons/lu";

interface PayrollRule {
  id?: string;
  name: string;
  code: string;
  description: string;
  category: string;
  applicableEmployeeGroup: string;
  status: "Draft" | "Active" | "Inactive";
  effectiveStartDate: string;
  effectiveEndDate?: string;
  policyReference?: string;
  // Calculation Basis
  calculationBasis: "Monthly" | "Daily" | "Hourly" | "PerUnit" | "FixedAmount" | "Percentage" | "TableBased";
  // Calculation Parameters (dynamic based on basis)
  baseAmount?: string;
  percentage?: string;
  multiplier?: string;
  hourlyRate?: string;
  dailyRate?: string;
  standardWorkingHours?: string;
  divisor?: string;
  minimumAmount?: string;
  maximumAmount?: string;
  contributionCeiling?: string;
  applicableThreshold?: string;
  roundingMethod?: "Round" | "RoundUp" | "RoundDown" | "Truncate";
  // Eligibility
  eligibilityType: "AllEmployees" | "Department" | "Position" | "EmploymentCategory" | "PayGrade" | "SelectedEmployees";
  selectedDepartments?: string[];
  selectedPositions?: string[];
  selectedCategories?: string[];
  selectedPayGrades?: string[];
  selectedEmployees?: string[];
  // Conditions
  minimumSalary?: string;
  maximumSalary?: string;
  minimumServiceMonths?: string;
  conditions?: Array<{ field: string; operator: string; value: string }>;
  // Tax Treatment
  taxable: boolean;
  subjectToStatutoryContribution: boolean;
  employerPaid: boolean;
  excludedFromContributionBasis?: string[];
  // Formula (if applicable)
  customFormula?: string;
  formulaVariables?: Array<{ name: string; description: string; dataType: string }>;
  // Metadata
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  version?: number;
}

const CALCULATION_BASIS_OPTIONS = [
  { value: "Monthly", label: "Monthly" },
  { value: "Daily", label: "Daily" },
  { value: "Hourly", label: "Hourly" },
  { value: "PerUnit", label: "Per Unit" },
  { value: "FixedAmount", label: "Fixed Amount" },
  { value: "Percentage", label: "Percentage" },
  { value: "TableBased", label: "Table-Based Calculation" },
];

const ROUNDING_METHODS = [
  { value: "Round", label: "Round (standard)" },
  { value: "RoundUp", label: "Round Up (ceiling)" },
  { value: "RoundDown", label: "Round Down (floor)" },
  { value: "Truncate", label: "Truncate" },
];

const ELIGIBILITY_OPTIONS = [
  { value: "AllEmployees", label: "All Eligible Employees" },
  { value: "Department", label: "Specific Department" },
  { value: "Position", label: "Specific Position" },
  { value: "EmploymentCategory", label: "Specific Employment Category" },
  { value: "PayGrade", label: "Specific Pay Grade" },
  { value: "SelectedEmployees", label: "Selected Employees" },
];

interface PayrollRuleEditorProps {
  rule?: PayrollRule;
  onSave: (rule: PayrollRule) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PayrollRuleEditor({
  rule,
  onSave,
  onCancel,
  loading = false,
}: PayrollRuleEditorProps) {
  const [formData, setFormData] = useState<PayrollRule>(
    rule || {
      name: "",
      code: "",
      description: "",
      category: "Earnings",
      applicableEmployeeGroup: "AllEmployees",
      status: "Draft",
      effectiveStartDate: new Date().toISOString().split("T")[0],
      calculationBasis: "Monthly",
      eligibilityType: "AllEmployees",
      taxable: true,
      subjectToStatutoryContribution: false,
      employerPaid: false,
    }
  );

  const [expandedSection, setExpandedSection] = useState<string>("general");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine which fields to show based on calculation basis
  const relevantFields = useMemo(() => {
    const base = ["baseAmount"];
    switch (formData.calculationBasis) {
      case "Percentage":
        return [...base, "percentage"];
      case "Hourly":
        return [...base, "hourlyRate", "standardWorkingHours"];
      case "Daily":
        return [...base, "dailyRate"];
      case "PerUnit":
        return [...base, "divisor"];
      default:
        return base;
    }
  }, [formData.calculationBasis]);

  const handleFieldChange = (field: keyof PayrollRule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        { field: "", operator: "equals", value: "" },
      ],
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index),
    }));
  };

  const handleConditionChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Rule name is required";
    if (!formData.code.trim()) newErrors.code = "Rule code is required";
    if (!formData.effectiveStartDate)
      newErrors.effectiveStartDate = "Effective start date is required";

    // Validate calculation parameters
    if (formData.calculationBasis === "Percentage" && !formData.percentage) {
      newErrors.percentage = "Percentage is required";
    }
    if (formData.calculationBasis === "Hourly" && !formData.hourlyRate) {
      newErrors.hourlyRate = "Hourly rate is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    await onSave(formData);
  };

  const Section = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() =>
          setExpandedSection(expandedSection === id ? "" : id)
        }
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 font-medium text-gray-900"
      >
        <span>{title}</span>
        <LuChevronDown
          className={`transition-transform ${
            expandedSection === id ? "rotate-180" : ""
          }`}
        />
      </button>
      {expandedSection === id && (
        <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );

  const FormField = ({
    label,
    value,
    onChange,
    type = "text",
    required = false,
    description,
    error,
    options,
    placeholder,
  }: {
    label: string;
    value: any;
    onChange: (value: any) => void;
    type?: string;
    step?: string;
    required?: boolean;
    description?: string;
    error?: string;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {description && (
          <div
            className="group relative cursor-help"
            title={description}
          >
            <LuInfo size={16} className="text-gray-400" />
          </div>
        )}
      </div>
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:ring-red-100"
              : "border-gray-300 focus:ring-violet-100"
          }`}
          rows={3}
        />
      ) : options ? (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:ring-red-100"
              : "border-gray-300 focus:ring-violet-100"
          }`}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          step={step}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:ring-red-100"
              : "border-gray-300 focus:ring-violet-100"
          }`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {rule ? `Edit Rule: ${rule.name}` : "Create New Payroll Rule"}
        </h2>
        {rule?.version && (
          <p className="text-sm text-gray-600 mt-2">Version {rule.version}</p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* General Information */}
        <Section id="general" title="A. General Information">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Rule Name"
              value={formData.name}
              onChange={(v) => handleFieldChange("name", v)}
              required
              error={errors.name}
              placeholder="e.g., Basic Salary, Housing Allowance"
            />
            <FormField
              label="Rule Code"
              value={formData.code}
              onChange={(v) => handleFieldChange("code", v)}
              required
              error={errors.code}
              placeholder="e.g., BASIC, HOU"
              description="Unique identifier for this rule"
            />
          </div>

          <FormField
            label="Description"
            value={formData.description}
            onChange={(v) => handleFieldChange("description", v)}
            type="textarea"
            placeholder="Explain what this rule calculates and why..."
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="Category"
              value={formData.category}
              onChange={(v) => handleFieldChange("category", v)}
              options={[
                { value: "Earnings", label: "Earnings" },
                { value: "Deductions", label: "Deductions" },
                { value: "Contributions", label: "Contributions" },
                { value: "Benefits", label: "Benefits" },
                { value: "Other", label: "Other" },
              ]}
            />
            <FormField
              label="Status"
              value={formData.status}
              onChange={(v) => handleFieldChange("status", v)}
              options={[
                { value: "Draft", label: "Draft" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
            />
            <FormField
              label="Employee Group"
              value={formData.applicableEmployeeGroup}
              onChange={(v) => handleFieldChange("applicableEmployeeGroup", v)}
              options={[
                { value: "AllEmployees", label: "All Employees" },
                { value: "FullTime", label: "Full-time Only" },
                { value: "PartTime", label: "Part-time Only" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Effective Start Date"
              value={formData.effectiveStartDate}
              onChange={(v) => handleFieldChange("effectiveStartDate", v)}
              type="date"
              required
              error={errors.effectiveStartDate}
            />
            <FormField
              label="Effective End Date"
              value={formData.effectiveEndDate}
              onChange={(v) => handleFieldChange("effectiveEndDate", v)}
              type="date"
              description="Leave blank if this rule is ongoing"
            />
          </div>

          <FormField
            label="Policy Reference"
            value={formData.policyReference}
            onChange={(v) => handleFieldChange("policyReference", v)}
            placeholder="e.g., Policy DOC-2025-001"
            description="Link to supporting policy document"
          />
        </Section>

        {/* Calculation Basis */}
        <Section id="basis" title="B. Calculation Basis">
          <FormField
            label="Calculation Method"
            value={formData.calculationBasis}
            onChange={(v) => handleFieldChange("calculationBasis", v)}
            options={CALCULATION_BASIS_OPTIONS}
          />

          <p className="text-sm text-gray-600">
            Showing parameters for: <strong>{formData.calculationBasis}</strong>
          </p>
        </Section>

        {/* Calculation Parameters */}
        <Section id="parameters" title="C. Calculation Parameters">
          <div className="space-y-4">
            {(relevantFields.includes("baseAmount") ||
              formData.calculationBasis === "FixedAmount") && (
              <FormField
                label="Base Amount (PHP)"
                value={formData.baseAmount}
                onChange={(v) => handleFieldChange("baseAmount", v)}
                type="number"
                step="0.01"
                description="Starting amount for calculation"
              />
            )}

            {relevantFields.includes("percentage") && (
              <FormField
                label="Percentage (%)"
                value={formData.percentage}
                onChange={(v) => handleFieldChange("percentage", v)}
                type="number"
                step="0.01"
                required={formData.calculationBasis === "Percentage"}
                error={errors.percentage}
                description="Applied as decimal (e.g., 10 = 10%)"
              />
            )}

            {relevantFields.includes("hourlyRate") && (
              <>
                <FormField
                  label="Hourly Rate (PHP)"
                  value={formData.hourlyRate}
                  onChange={(v) => handleFieldChange("hourlyRate", v)}
                  type="number"
                  step="0.01"
                  required={formData.calculationBasis === "Hourly"}
                  error={errors.hourlyRate}
                />
                <FormField
                  label="Standard Working Hours"
                  value={formData.standardWorkingHours}
                  onChange={(v) => handleFieldChange("standardWorkingHours", v)}
                  type="number"
                  description="Hours per day (typically 8)"
                />
              </>
            )}

            {relevantFields.includes("dailyRate") && (
              <FormField
                label="Daily Rate (PHP)"
                value={formData.dailyRate}
                onChange={(v) => handleFieldChange("dailyRate", v)}
                type="number"
                step="0.01"
              />
            )}

            {relevantFields.includes("divisor") && (
              <FormField
                label="Divisor"
                value={formData.divisor}
                onChange={(v) => handleFieldChange("divisor", v)}
                type="number"
                step="0.01"
                description="Amount to divide by for per-unit calculation"
              />
            )}

            {/* Advanced parameters */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Advanced Parameters (Optional)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Minimum Amount (PHP)"
                  value={formData.minimumAmount}
                  onChange={(v) => handleFieldChange("minimumAmount", v)}
                  type="number"
                  step="0.01"
                  description="Floor value for this calculation"
                />
                <FormField
                  label="Maximum Amount (PHP)"
                  value={formData.maximumAmount}
                  onChange={(v) => handleFieldChange("maximumAmount", v)}
                  type="number"
                  step="0.01"
                  description="Ceiling value for this calculation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  label="Contribution Ceiling (PHP)"
                  value={formData.contributionCeiling}
                  onChange={(v) => handleFieldChange("contributionCeiling", v)}
                  type="number"
                  step="0.01"
                  description="Maximum annual contribution"
                />
                <FormField
                  label="Rounding Method"
                  value={formData.roundingMethod}
                  onChange={(v) => handleFieldChange("roundingMethod", v)}
                  options={ROUNDING_METHODS}
                  description="How to round calculated amounts"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Eligibility */}
        <Section id="eligibility" title="D. Eligibility and Applicability">
          <FormField
            label="Applies To"
            value={formData.eligibilityType}
            onChange={(v) => handleFieldChange("eligibilityType", v)}
            options={ELIGIBILITY_OPTIONS}
          />

          {formData.eligibilityType === "Department" && (
            <FormField
              label="Select Departments"
              value={formData.selectedDepartments?.join(",")}
              onChange={(v) =>
                handleFieldChange("selectedDepartments", v.split(",").filter(Boolean))
              }
              placeholder="e.g., HR, Engineering, Finance (comma-separated)"
              description="Enter department names or IDs, separated by commas"
            />
          )}

          {formData.eligibilityType === "Position" && (
            <FormField
              label="Select Positions"
              value={formData.selectedPositions?.join(",")}
              onChange={(v) =>
                handleFieldChange("selectedPositions", v.split(",").filter(Boolean))
              }
              placeholder="e.g., Manager, Developer, Analyst (comma-separated)"
              description="Enter position titles, separated by commas"
            />
          )}

          {formData.eligibilityType === "EmploymentCategory" && (
            <FormField
              label="Select Employment Categories"
              value={formData.selectedCategories?.join(",")}
              onChange={(v) =>
                handleFieldChange("selectedCategories", v.split(",").filter(Boolean))
              }
              placeholder="e.g., FullTime, PartTime, Contractual (comma-separated)"
              description="Enter employment categories, separated by commas"
            />
          )}

          {formData.eligibilityType === "PayGrade" && (
            <FormField
              label="Select Pay Grades"
              value={formData.selectedPayGrades?.join(",")}
              onChange={(v) =>
                handleFieldChange("selectedPayGrades", v.split(",").filter(Boolean))
              }
              placeholder="e.g., A, B, C or G1, G2, G3 (comma-separated)"
              description="Enter pay grade codes, separated by commas"
            />
          )}

          {formData.eligibilityType === "SelectedEmployees" && (
            <FormField
              label="Select Employees"
              value={formData.selectedEmployees?.join(",")}
              onChange={(v) =>
                handleFieldChange("selectedEmployees", v.split(",").filter(Boolean))
              }
              placeholder="e.g., EMP001, EMP002, EMP003 (comma-separated)"
              description="Enter employee IDs, separated by commas"
            />
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
            <FormField
              label="Minimum Salary (PHP)"
              value={formData.minimumSalary}
              onChange={(v) => handleFieldChange("minimumSalary", v)}
              type="number"
              step="0.01"
              description="Salary threshold to qualify"
            />
            <FormField
              label="Maximum Salary (PHP)"
              value={formData.maximumSalary}
              onChange={(v) => handleFieldChange("maximumSalary", v)}
              type="number"
              step="0.01"
              description="Upper salary limit"
            />
          </div>

          <FormField
            label="Minimum Service (months)"
            value={formData.minimumServiceMonths}
            onChange={(v) => handleFieldChange("minimumServiceMonths", v)}
            type="number"
            description="Service period required to qualify"
          />
        </Section>

        {/* Conditions and Exceptions */}
        <Section id="conditions" title="E. Conditions and Exceptions">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Custom Conditions
                </h4>
                <button
                  onClick={handleAddCondition}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-300 rounded hover:bg-violet-50"
                  type="button"
                >
                  <LuPlus size={14} />
                  Add Condition
                </button>
              </div>

              {(!formData.conditions || formData.conditions.length === 0) ? (
                <p className="text-sm text-gray-500 italic">
                  No custom conditions defined. Click "Add Condition" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <FormField
                          label="Field"
                          value={condition.field}
                          onChange={(v) => handleConditionChange(index, "field", v)}
                          options={[
                            { value: "salary", label: "Salary" },
                            { value: "serviceMonths", label: "Service Months" },
                            { value: "department", label: "Department" },
                            { value: "position", label: "Position" },
                            { value: "employmentCategory", label: "Employment Category" },
                            { value: "payGrade", label: "Pay Grade" },
                            { value: "age", label: "Age" },
                            { value: "gender", label: "Gender" },
                          ]}
                        />
                        <FormField
                          label="Operator"
                          value={condition.operator}
                          onChange={(v) => handleConditionChange(index, "operator", v)}
                          options={[
                            { value: "equals", label: "Equals" },
                            { value: "notEquals", label: "Not Equals" },
                            { value: "greaterThan", label: "Greater Than" },
                            { value: "lessThan", label: "Less Than" },
                            { value: "greaterOrEqual", label: "Greater or Equal" },
                            { value: "lessOrEqual", label: "Less or Equal" },
                            { value: "contains", label: "Contains" },
                            { value: "notContains", label: "Does Not Contain" },
                          ]}
                        />
                        <FormField
                          label="Value"
                          value={condition.value}
                          onChange={(v) => handleConditionChange(index, "value", v)}
                          placeholder="Enter value..."
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveCondition(index)}
                        className="mt-7 p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        title="Remove condition"
                        type="button"
                      >
                        <LuTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Exception Handling
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Configure how the system should handle exceptions to this rule:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="When Employee Not Eligible"
                  value="skip"
                  onChange={() => {}}
                  options={[
                    { value: "skip", label: "Skip (default)" },
                    { value: "zero", label: "Apply with zero amount" },
                    { value: "error", label: "Raise error" },
                  ]}
                  description="How to handle ineligible employees"
                />
                <FormField
                  label="When Calculation Fails"
                  value="error"
                  onChange={() => {}}
                  options={[
                    { value: "error", label: "Raise error (default)" },
                    { value: "zero", label: "Apply zero amount" },
                    { value: "skip", label: "Skip" },
                  ]}
                  description="How to handle calculation errors"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Formula Configuration */}
        {(formData.calculationBasis === "Percentage" || formData.calculationBasis === "TableBased") && (
          <Section id="formula" title="E.1 Formula Configuration">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <LuTriangle className="flex-shrink-0 text-yellow-600 mt-0.5" size={20} />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Formula Builder</p>
                  <p>
                    Use the approved variables and operators below. Never enter executable code.
                    The system uses a safe formula engine that evaluates expressions only.
                  </p>
                </div>
              </div>

              <FormField
                label="Custom Formula (Optional)"
                value={formData.customFormula || ""}
                onChange={(v) => handleFieldChange("customFormula", v)}
                type="textarea"
                placeholder="e.g., (baseSalary * 0.10) + fixedAmount"
                description="Use approved variables like: baseSalary, hoursWorked, dailyRate, percentage"
              />

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Available Variables</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">baseSalary</code>
                    <p className="text-xs text-gray-600 mt-1">Employee's base monthly salary</p>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">dailyRate</code>
                    <p className="text-xs text-gray-600 mt-1">Daily rate (baseSalary / 22)</p>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">hourlyRate</code>
                    <p className="text-xs text-gray-600 mt-1">Hourly rate (dailyRate / 8)</p>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">hoursWorked</code>
                    <p className="text-xs text-gray-600 mt-1">Actual hours worked this period</p>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">daysWorked</code>
                    <p className="text-xs text-gray-600 mt-1">Actual days worked this period</p>
                  </div>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                    <code className="text-violet-600">overtimeHours</code>
                    <p className="text-xs text-gray-600 mt-1">Overtime hours this period</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Supported Operators</h4>
                <div className="flex flex-wrap gap-2">
                  {["+", "-", "*", "/", "(", ")", "MAX", "MIN", "ROUND", "IF"].map((op) => (
                    <span
                      key={op}
                      className="px-2 py-1 bg-violet-100 text-violet-800 text-xs font-mono rounded"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              {formData.customFormula && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Formula Preview</h4>
                  <p className="text-sm text-blue-800 font-mono break-words">
                    {formData.customFormula}
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Example with baseSalary=₱30,000: ₱
                    {(() => {
                      try {
                        const formula = formData.customFormula
                          .replace(/baseSalary/g, "30000")
                          .replace(/dailyRate/g, String(30000 / 22))
                          .replace(/hourlyRate/g, String(30000 / 22 / 8))
                          .replace(/percentage/g, formData.percentage || "0");
                        // Simple eval for preview only (not executed on server)
                        return eval(formula).toFixed(2);
                      } catch (e) {
                        return "Invalid formula";
                      }
                    })()}
                  </p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Tax Treatment */}
        <Section id="tax" title="F. Tax and Contribution Treatment">
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => handleFieldChange("taxable", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Taxable Income
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.subjectToStatutoryContribution}
                onChange={(e) =>
                  handleFieldChange("subjectToStatutoryContribution", e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Subject to Statutory Contribution
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.employerPaid}
                onChange={(e) =>
                  handleFieldChange("employerPaid", e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Employer-Paid Benefit
              </span>
            </label>
          </div>
        </Section>

        {/* Metadata */}
        {rule && (
          <Section id="metadata" title="G. Version Information">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium">Created By:</p>
                <p>{rule.createdBy || "—"}</p>
              </div>
              <div>
                <p className="font-medium">Created At:</p>
                <p>{rule.createdAt ? new Date(rule.createdAt).toLocaleString() : "—"}</p>
              </div>
              <div>
                <p className="font-medium">Last Modified By:</p>
                <p>{rule.lastModifiedBy || "—"}</p>
              </div>
              <div>
                <p className="font-medium">Last Modified At:</p>
                <p>{rule.lastModifiedAt ? new Date(rule.lastModifiedAt).toLocaleString() : "—"}</p>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <LuCheck className="flex-shrink-0 text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">Rule Summary</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>{formData.code}</strong> ({formData.name}): {formData.calculationBasis}{" "}
                  calculation for {formData.eligibilityType} employees.
                </p>
                <p>
                  Status: <strong>{formData.status}</strong>. Effective from{" "}
                  {new Date(formData.effectiveStartDate).toLocaleDateString()}
                  {formData.effectiveEndDate && ` to ${new Date(formData.effectiveEndDate).toLocaleDateString()}`}.
                </p>
                
                {/* Calculation details */}
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="font-medium mb-1">Calculation Details:</p>
                  {formData.calculationBasis === "FixedAmount" && formData.baseAmount && (
                    <p>Fixed amount: ₱{parseFloat(formData.baseAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  )}
                  {formData.calculationBasis === "Percentage" && formData.percentage && (
                    <p>{formData.percentage}% of base salary</p>
                  )}
                  {formData.calculationBasis === "Hourly" && formData.hourlyRate && (
                    <p>₱{formData.hourlyRate}/hour × {formData.standardWorkingHours || 8} hours</p>
                  )}
                  {formData.calculationBasis === "Daily" && formData.dailyRate && (
                    <p>₱{formData.dailyRate}/day</p>
                  )}
                  {formData.customFormula && (
                    <p className="font-mono text-xs">Formula: {formData.customFormula}</p>
                  )}
                </div>

                {/* Eligibility summary */}
                {formData.eligibilityType !== "AllEmployees" && (
                  <div className="mt-3 pt-3 border-t border-blue-300">
                    <p className="font-medium mb-1">Eligibility Restrictions:</p>
                    {formData.selectedDepartments && formData.selectedDepartments.length > 0 && (
                      <p>Departments: {formData.selectedDepartments.join(", ")}</p>
                    )}
                    {formData.selectedPositions && formData.selectedPositions.length > 0 && (
                      <p>Positions: {formData.selectedPositions.join(", ")}</p>
                    )}
                    {formData.selectedPayGrades && formData.selectedPayGrades.length > 0 && (
                      <p>Pay Grades: {formData.selectedPayGrades.join(", ")}</p>
                    )}
                    {formData.minimumSalary && (
                      <p>Minimum Salary: ₱{parseFloat(formData.minimumSalary).toLocaleString("en-PH")}</p>
                    )}
                    {formData.minimumServiceMonths && (
                      <p>Minimum Service: {formData.minimumServiceMonths} months</p>
                    )}
                  </div>
                )}

                {/* Conditions summary */}
                {formData.conditions && formData.conditions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-300">
                    <p className="font-medium mb-1">Conditions: ({formData.conditions.length})</p>
                    <ul className="list-disc list-inside space-y-1">
                      {formData.conditions.map((c, i) => (
                        <li key={i} className="text-xs">
                          {c.field} {c.operator} {c.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tax treatment */}
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="font-medium mb-1">Tax Treatment:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{formData.taxable ? "Taxable" : "Non-taxable"}</li>
                    {formData.subjectToStatutoryContribution && (
                      <li>Subject to statutory contributions</li>
                    )}
                    {formData.employerPaid && <li>Employer-paid benefit</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Preview */}
        {(formData.calculationBasis === "Percentage" || 
          formData.calculationBasis === "FixedAmount" || 
          formData.calculationBasis === "Hourly" ||
          formData.calculationBasis === "Daily") && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Calculation Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Sample Input:</p>
                <p className="font-mono text-gray-900">Base Salary: ₱30,000</p>
                {formData.calculationBasis === "Hourly" && (
                  <p className="font-mono text-gray-900">Hours: {formData.standardWorkingHours || 8}</p>
                )}
              </div>
              <div>
                <p className="text-gray-600 mb-1">Calculation:</p>
                {formData.calculationBasis === "FixedAmount" && formData.baseAmount && (
                  <p className="font-mono text-gray-900">Fixed = ₱{formData.baseAmount}</p>
                )}
                {formData.calculationBasis === "Percentage" && formData.percentage && (
                  <p className="font-mono text-gray-900">₱30,000 × {formData.percentage}%</p>
                )}
                {formData.calculationBasis === "Hourly" && formData.hourlyRate && (
                  <p className="font-mono text-gray-900">₱{formData.hourlyRate} × {formData.standardWorkingHours || 8}</p>
                )}
                {formData.calculationBasis === "Daily" && formData.dailyRate && (
                  <p className="font-mono text-gray-900">₱{formData.dailyRate} × days</p>
                )}
              </div>
              <div>
                <p className="text-gray-600 mb-1">Result:</p>
                <p className="font-mono text-gray-900 text-lg font-semibold">
                  ₱{(() => {
                    if (formData.calculationBasis === "FixedAmount" && formData.baseAmount) {
                      return parseFloat(formData.baseAmount).toFixed(2);
                    }
                    if (formData.calculationBasis === "Percentage" && formData.percentage) {
                      return (30000 * parseFloat(formData.percentage) / 100).toFixed(2);
                    }
                    if (formData.calculationBasis === "Hourly" && formData.hourlyRate) {
                      return (parseFloat(formData.hourlyRate) * parseFloat(formData.standardWorkingHours || "8")).toFixed(2);
                    }
                    if (formData.calculationBasis === "Daily" && formData.dailyRate) {
                      return (parseFloat(formData.dailyRate) * 22).toFixed(2);
                    }
                    return "—";
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end bg-white p-4 rounded-lg border border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:bg-gray-400"
        >
          <LuSave size={16} />
          {loading ? "Saving..." : "Save Rule"}
        </button>
      </div>
    </div>
  );
}
