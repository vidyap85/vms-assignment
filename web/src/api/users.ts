import { api } from "./client";
import type { Role, User } from "../types";

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: Role;
  enabled?: boolean;
  cameraIds?: string[];
}

export function listUsers() {
  return api.get<User[]>("/users");
}

export function createUser(input: UserInput) {
  return api.post<User>("/users", input);
}

export function updateUser(id: string, input: Partial<UserInput>) {
  return api.put<User>(`/users/${id}`, input);
}

export function deleteUser(id: string) {
  return api.delete<{ ok: true }>(`/users/${id}`);
}
