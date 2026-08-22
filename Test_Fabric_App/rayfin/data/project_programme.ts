import {
  authenticated,
  date,
  entity,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class project_programme {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @uuid()
  programme_item_definition_guid!: string;

  @date({ optional: true })
  baseline_start?: Date;

  @date({ optional: true })
  baseline_end?: Date;

  @date({ optional: true })
  target_start?: Date;

  @date({ optional: true })
  target_end?: Date;

  @date({ optional: true })
  reporting_start?: Date;

  @date({ optional: true })
  reporting_end?: Date;

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
