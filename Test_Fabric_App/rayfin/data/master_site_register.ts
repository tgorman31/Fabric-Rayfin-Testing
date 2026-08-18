import { authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

@entity()
@authenticated('*')
export class master_site_register {
  @uuid()
  id!: string;

  @uuid({ unique: true })
  guid!: string;

  @text({ max: 5, unique: true })
  site_code!: string;

  @int({ min: 1 })
  next_project_number!: number;

  @date()
  created_at!: Date;

  @text({ max: 200 })
  created_by_user_id!: string;

  @text({ max: 320 })
  created_by_user_email!: string;
}
