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
export class app_user_role {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @text({ max: 320 })
  user_email!: string;

  @text({ max: 100 })
  role_code!: string;

  @boolean()
  active_flag!: boolean;

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
}
