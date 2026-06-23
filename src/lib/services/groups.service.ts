import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroupId, Result } from '@/lib/types';
import { createGroupSchema, type CreateGroupData } from '@/lib/validations/group';
import { mapSupabaseError, validationError } from './errors';

export type CreateGroupInput = CreateGroupData;

export interface CreateGroupOutput {
  groupId: GroupId;
}

export const CREATE_GROUP_DRAFT_KEY = 'create-group-draft';

export async function createGroup(
  supabase: SupabaseClient,
  input: CreateGroupInput,
): Promise<Result<CreateGroupOutput>> {
  return new GroupsService(supabase).createGroup(input);
}

export class GroupsService {
  constructor(private supabase: SupabaseClient) {}

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