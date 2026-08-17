// src/services/userService.ts
import { get, put, patch } from './api-client';
import type { User } from '@/hooks/use-auth';

/**
 * User profile update input
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
}

/**
 * Get current user profile
 * @returns User profile data
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await get<User>('/user/profile');
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user profile';
    throw new Error(message);
  }
}

/**
 * Update user profile
 * @param input - User profile update data
 * @returns Updated user data
 */
export async function updateUserProfile(input: UpdateUserInput): Promise<User> {
  try {
    const response = await put<User>('/user/profile', input);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user profile';
    throw new Error(message);
  }
}

/**
 * Partially update user profile
 * @param input - Partial user profile update data
 * @returns Updated user data
 */
export async function patchUserProfile(input: Partial<UpdateUserInput>): Promise<User> {
  try {
    const response = await patch<User>('/user/profile', input);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user profile';
    throw new Error(message);
  }
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User data
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    const response = await get<User>(`/user/${userId}`);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    throw new Error(message);
  }
}
