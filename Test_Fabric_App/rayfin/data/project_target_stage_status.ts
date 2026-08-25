import {
  authenticated,
  date,
  entity,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class project_target_stage_status {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @text({ max: 100 })
  stage_code!: string;

  @text({ max: 1, optional: true })
  rag_code?: string;

  @text({ max: 4000, optional: true })
  rag_comment?: string;

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
