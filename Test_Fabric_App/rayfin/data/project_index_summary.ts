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
export class project_index_summary {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @text({ max: 20 })
  project_ref!: string;

  @text({ max: 200, optional: true })
  project_name?: string;

  @text({ max: 100, optional: true })
  gateway_code?: string;

  @text({ max: 100, optional: true })
  reporting_stage_code?: string;

  @text({ max: 100, optional: true })
  sub_stage_code?: string;

  @text({ max: 100, optional: true })
  project_status_code?: string;

  @text({ max: 100, optional: true })
  reporting_status_code?: string;

  @int({ min: 0, optional: true })
  phase_number?: number;

  @text({ max: 200, optional: true })
  local_authority_code?: string;

  @text({ max: 200, optional: true })
  origin_of_land_code?: string;

  @text({ max: 4000, optional: true })
  project_description?: string;

  @text({ max: 500, optional: true })
  map_link?: string;

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
