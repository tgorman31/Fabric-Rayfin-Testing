import {
  authenticated,
  date,
  entity,
  text,
  uuid,
} from "@microsoft/rayfin-core";

@entity()
@authenticated("*")
export class master_project_register {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @uuid({ optional: true })
  parent_guid?: string;

  @uuid()
  root_guid!: string;

  @text({ max: 20 })
  project_ref!: string;

  @uuid()
  site_guid!: string;

  @date()
  effective_from!: Date;

  @date()
  effective_to!: Date;

  @text({ max: 200 })
  created_by_user_id!: string;

  @text({ max: 320 })
  created_by_user_email!: string;
}
