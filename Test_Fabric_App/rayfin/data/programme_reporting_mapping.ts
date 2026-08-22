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
export class programme_reporting_mapping {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  reporting_item_definition_guid!: string;

  @text({ max: 20 })
  reporting_field!: string;

  @uuid()
  target_item_definition_guid!: string;

  @text({ max: 20 })
  target_field!: string;

  @uuid({ optional: true })
  reporting_reference_item_definition_guid?: string;

  @boolean()
  is_active!: boolean;

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
