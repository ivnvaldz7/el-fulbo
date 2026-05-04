import type { SupabaseClient } from '@supabase/supabase-js';
import { GroupId, Result, GroupWithMemberships, UserId, GroupRole } from '@/lib/types'; // Updated imports
import { createGroupSchema, type CreateGroupData } from '@/lib/validations/group';
import { mapSupabaseError, validationError } from './errors';

export type CreateGroupInput = CreateGroupData;

export interface CreateGroupOutput {
  groupId: GroupId;
}

export const CREATE_GROUP_DRAFT_KEY = 'create-group-draft';

export class GroupsService { // Convert to class
  constructor(private supabase: SupabaseClient) {}

  async getGroupWithMemberships(groupId: GroupId): Promise<GroupWithMemberships | null> {
    const { data, error } = await this.supabase
      .from('groups')
      .select('*, group_memberships(*)') // Select all from group and all from related group_memberships
      .eq('id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw new Error(error.message);
    }

    return data as GroupWithMemberships;
  }

  async isUserAdminOrOwner(userId: UserId, groupId: GroupId): Promise<boolean> {
    const group = await this.getGroupWithMemberships(groupId);
    if (!group) return false;

    // Check if user is the admin of the group (adminUserId)
    if (group.adminUserId === userId) {
      return true;
    }

    // Check if user has an 'owner' or 'admin' role in group_memberships
    const membership = group.group_memberships.find(m => m.userId === userId); // Changed m.user_id to m.userId
    if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
      return true;
    }

    return false;
  }

  async createGroup(
    input: CreateGroupInput,
  ): Promise<Result<CreateGroupOutput>> {
    const parsed = createGroupSchema.safeParse(input);

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error.flatten()) };
    }

    const { data, error } = await this.supabase.rpc('create_group', {
      p_name: parsed.data.name,
      p_modality: parsed.data.modality,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.group_id) {
      return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' } };
    }

    return { ok: true, data: { groupId: row.group_id } };
  }
}