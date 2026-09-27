// Core User and Authentication Types
export type UserRole = 'citizen' | 'patwari' | 'tehsildar' | 'admin';

export interface User {
  id?: string;
  username: string;
  email: string;
  full_name: string;
  name?: string;
  role: UserRole;
  created_at?: string;
  // Additional profile fields for role-specific data
  phone?: string;
  district?: string;
  tehsil?: string;
  employee_id?: string;
  department?: string;
  badge_number?: string;
  jurisdiction?: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

// Parcel Types
export interface Parcel {
  parcel_id: string;
  survey_number: string;
  district: string;
  tehsil: string;
  village: string;
  owner_name: string;
  area: number;
  land_type: string;
  latitude?: number;
  longitude?: number;
  status: 'VERIFIED' | 'REQUIRES_VERIFICATION' | 'DISPUTED' | 'IN_REVIEW';
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  updated_at: string;
}

export interface ParcelEvent {
  event_id: string;
  parcel_id: string;
  event_type: string;
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  metadata?: Record<string, any>;
}

// Document Types
export interface Document {
  document_id: string;
  parcel_id: string;
  document_type: string;
  file_name: string;
  file_url?: string;
  extracted_data: Record<string, any>;
  upload_date: string;
  verification_status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISCREPANCY_DETECTED';
}

// Risk Analysis Types
export interface RiskReason {
  factor: string;
  impact: number;
  description?: string;
}

export interface RiskAnalysis {
  risk_id: string;
  parcel_id: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trend: 'STABLE' | 'INCREASING' | 'DECREASING';
  reasons: RiskReason[];
  recommended_actions: string[];
  created_at: string;
}

// Alert Types
export interface Alert {
  alert_id: string;
  parcel_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  created_at: string;
  updated_at: string;
}

// Case Types
export interface Case {
  case_id: string;
  parcel_id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigned_to?: string;
  risk_level?: string;
  created_at: string;
  updated_at: string;
}

// Verification Types
export interface Verification {
  verification_id: string;
  parcel_id: string;
  case_id?: string;
  action_taken: string;
  notes: string;
  verified_by: string;
  status: string;
  timestamp: string;
}

// API Error Type
export interface ApiError {
  error: {
    code: number;
    message: string;
    path: string;
  };
}
