export type CompanyStatus = 'Active' | 'Inactive';
export type BusinessType = 'BPO / IT Services' | 'Information Technology' | 'Manufacturing' | 'Retail' | 'Healthcare' | 'Education' | 'Logistics' | 'Professional Services' | 'Other';
export type HolidayType = 'Regular Holiday' | 'Special Non-Working Day' | 'Special Working Day' | 'Company Holiday';
export interface CompanyProfile { name: string; businessType: BusinessType; tin: string; email: string; phone: string; address: string; logo: string; status: CompanyStatus; established: string; description: string }
export interface CompanyBranch { id: string; name: string; code: string; address: string; location: string; phone: string; manager: string; status: CompanyStatus; employees: number }
export interface CompanyDepartment { id: string; name: string; code: string; head: string; description: string; status: CompanyStatus; employees: number }
export interface CompanyHoliday { id: string; name: string; date: string; type: HolidayType; appliesTo: string; description: string; status: CompanyStatus }
