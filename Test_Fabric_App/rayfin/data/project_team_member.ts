import {
  authenticated,
  boolean,
  date,
  entity,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class project_team_member {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @text({ max: 200, optional: true })
  person_name?: string;

  @text({ max: 320, optional: true })
  staff_identifier?: string;

  @text({ max: 200, optional: true })
  directory_object_id?: string;

  @text({ max: 20 })
  entry_mode!: string;

  @boolean()
  is_unverified!: boolean;

  @text({ max: 100, optional: true })
  staff_role_code?: string;

  @text({ max: 100, optional: true })
  team_code?: string;

  @boolean()
  is_responsible_manager!: boolean;

  @date()
  last_reviewed_at!: Date;

  @date()
  created_at!: Date;

  @text({ max: 200 })
  created_by_user_id!: string;

  @text({ max: 320 })
  created_by_user_email!: string;

  @date()
  updated_at!: Date;

  @text({ max: 200 })
  updated_by_user_id!: string;

  @text({ max: 320 })
  updated_by_user_email!: string;
}
