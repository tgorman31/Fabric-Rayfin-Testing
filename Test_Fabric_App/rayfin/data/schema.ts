import type { app_user_role } from "./app_user_role.js";
import type { master_project_register } from "./master_project_register.js";
import type { master_site_register } from "./master_site_register.js";
import type { project_index_summary } from "./project_index_summary.js";
import type { project_reporting_programme_item } from "./project_reporting_programme_item.js";
import type { project_team_member } from "./project_team_member.js";

export type AppSchema = {
  master_site_register: master_site_register;
  master_project_register: master_project_register;
  app_user_role: app_user_role;
  project_index_summary: project_index_summary;
  project_team_member: project_team_member;
  project_reporting_programme_item: project_reporting_programme_item;
};

export const schema = [];
