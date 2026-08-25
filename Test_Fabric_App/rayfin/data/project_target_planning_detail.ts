import {
  authenticated,
  date,
  entity,
  int,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class project_target_planning_detail {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @text({ max: 20, optional: true })
  advancing_gateway4_code?: string;

  @text({ max: 20, optional: true })
  planning_granted_code?: string;

  @text({ max: 4000, optional: true })
  partial_advance_g4_name?: string;

  @int({ optional: true })
  partial_advance_g4_homes?: number;

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
