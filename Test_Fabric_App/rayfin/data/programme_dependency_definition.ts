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
export class programme_dependency_definition {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid()
  predecessor_item_definition_guid!: string;

  @uuid()
  successor_item_definition_guid!: string;

  @text({ max: 20 })
  dependency_type!: string;

  @int()
  lag_days!: number;

  @text({ max: 20 })
  successor_field!: string;

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
