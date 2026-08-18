import type { master_project_register } from "./master_project_register.js";
import type { master_site_register } from "./master_site_register.js";

export type AppSchema = {
  master_site_register: master_site_register;
  master_project_register: master_project_register;
};

export const schema = [];
