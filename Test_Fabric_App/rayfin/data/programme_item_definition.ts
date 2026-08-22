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
export class programme_item_definition {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @text({ max: 200, unique: true })
  item_code!: string;

  @text({ max: 20 })
  programme_area!: string;

  @text({ max: 100 })
  stage_code!: string;

  @text({ max: 200 })
  row_label!: string;

  @text({ max: 30 })
  row_type!: string;

  @int({ min: 0 })
  sort_order!: number;

  @text({ max: 10, optional: true })
  level_code?: string;

  @boolean()
  is_active!: boolean;

  @boolean()
  is_editable!: boolean;

  @boolean()
  is_derived!: boolean;

  @date()
  effective_from!: Date;

  @date({ optional: true })
  effective_to?: Date;

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
