import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const supabaseUrl = projectId
  ? `https://${projectId}.supabase.co`
  : "";

export const supabase =
  projectId && publicAnonKey
    ? createClient(supabaseUrl, publicAnonKey)
    : null;
