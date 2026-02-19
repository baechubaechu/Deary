import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const client = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

export const set = async (key: string, value: unknown): Promise<void> => {
  const supabase = client();
  const { error } = await supabase
    .from("kv_store_dd0ac201")
    .upsert({ key, value });
  if (error) throw new Error(error.message);
};

export const get = async (key: string): Promise<unknown> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_dd0ac201")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase
    .from("kv_store_dd0ac201")
    .delete()
    .eq("key", key);
  if (error) throw new Error(error.message);
};

export const getByPrefix = async (prefix: string): Promise<unknown[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_dd0ac201")
    .select("key, value")
    .like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => d.value);
};

/** key, value 쌍 반환 (구 형식 복구용) */
export const getByPrefixWithKeys = async (
  prefix: string
): Promise<{ key: string; value: unknown }[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("kv_store_dd0ac201")
    .select("key, value")
    .like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({ key: d.key, value: d.value }));
};
