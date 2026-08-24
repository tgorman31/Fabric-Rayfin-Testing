import type { app_user_role } from "./app_user_role.js";
import type { master_project_register } from "./master_project_register.js";
import type { master_site_register } from "./master_site_register.js";
import type { programme_dependency_definition } from "./programme_dependency_definition.js";
import type { programme_item_definition } from "./programme_item_definition.js";
import type { programme_reporting_mapping } from "./programme_reporting_mapping.js";
import type { programme_summary_member } from "./programme_summary_member.js";
import type { project_index_summary } from "./project_index_summary.js";
import type { project_target_ddtc_detail } from "./project_target_ddtc_detail.js";
import type { project_target_stage_status } from "./project_target_stage_status.js";
import type { project_programme } from "./project_programme.js";
import type { project_reporting_programme_item } from "./project_reporting_programme_item.js";
import type { project_team_member } from "./project_team_member.js";

export type AppSchema = {
  master_site_register: master_site_register;
  master_project_register: master_project_register;
  app_user_role: app_user_role;
  programme_dependency_definition: programme_dependency_definition;
  programme_item_definition: programme_item_definition;
  programme_reporting_mapping: programme_reporting_mapping;
  programme_summary_member: programme_summary_member;
  project_index_summary: project_index_summary;
  project_target_ddtc_detail: project_target_ddtc_detail;
  project_target_stage_status: project_target_stage_status;
  project_programme: project_programme;
  project_team_member: project_team_member;
  project_reporting_programme_item: project_reporting_programme_item;
};

export const schema = [];
