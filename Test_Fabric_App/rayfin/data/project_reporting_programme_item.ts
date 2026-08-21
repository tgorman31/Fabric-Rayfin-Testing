import {
  authenticated,
  boolean,
  date,
  entity,
  int,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class project_reporting_programme_item {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  project_guid!: string;

  @text({ max: 100 })
  section_code!: string;

  @text({ max: 100 })
  row_code!: string;

  @text({ max: 200 })
  row_label!: string;

  @text({ max: 10 })
  level_code!: string;

  @int({ min: 0 })
  sort_order!: number;

  @boolean()
  is_editable!: boolean;

  @date({ optional: true })
  start_date?: Date;

  @date({ optional: true })
  end_date?: Date;

  @date({ optional: true })
  reporting_date?: Date;

  @text({ max: 10, optional: true })
  reference_rag_code?: string;

  @text({ max: 2000, optional: true })
  reference_rag_comment?: string;

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
