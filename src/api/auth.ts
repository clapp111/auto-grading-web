import type {
  ApiResponse,
  TokenResponse,
  MemberResponse,
  PresignedUrlResponse,
} from "@/types/dto";
import type { AffiliationRole } from "@/types/enums";
import { apiClient } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  affiliation: string;
  affiliation_role: AffiliationRole;
}

export const authApi = {
  login: (body: LoginRequest) =>
    apiClient
      .post<ApiResponse<TokenResponse>>("/auth/login", body)
      .then((r) => r.data),

  signup: (body: SignupRequest) =>
    apiClient
      .post<ApiResponse<MemberResponse>>("/auth/signup", body)
      .then((r) => r.data),

  me: () =>
    apiClient
      .get<ApiResponse<MemberResponse>>("/members/me")
      .then((r) => r.data),

  uploadProfilePresigned: (body: { file_name: string; content_type: string }) =>
    apiClient
      .post<ApiResponse<PresignedUrlResponse>>(
        "/members/me/profile/upload",
        body,
      )
      .then((r) => r.data),

  updateProfile: (body: {
    affiliation?: string;
    affiliation_role?: AffiliationRole;
    profile_url?: string | null;
  }) =>
    apiClient
      .patch<ApiResponse<MemberResponse>>("/members/me", body)
      .then((r) => r.data),

  updatePassword: (body: { current_password: string; new_password: string }) =>
    apiClient
      .patch<ApiResponse<null>>("/members/me/password", body)
      .then((r) => r.data),
};
