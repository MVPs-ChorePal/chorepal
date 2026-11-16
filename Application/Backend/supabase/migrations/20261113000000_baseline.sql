


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_chore"("p_chore_id" bigint) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_child public.users%ROWTYPE;
  v_chore public.chores%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can approve chores';
  END IF;

  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chore not found'; END IF;

  SELECT * INTO v_child FROM public.users WHERE id = v_chore.assigned_to FOR UPDATE;
  IF v_child.family_id IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'chore is not in your household';
  END IF;

  IF v_chore.status <> 'completed' THEN
    RAISE EXCEPTION 'chore is not waiting for approval';
  END IF;

  UPDATE public.chores
  SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
  WHERE id = p_chore_id;

  INSERT INTO public.transactions (user_id, chore_id, amount, type)
  VALUES (v_chore.assigned_to, p_chore_id, v_chore.reward_amount, 'credit');

  UPDATE public.users
  SET current_balance = COALESCE(current_balance, 0) + v_chore.reward_amount
  WHERE id = v_chore.assigned_to
  RETURNING current_balance INTO v_balance;

  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."approve_chore"("p_chore_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_family_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."current_family_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM public.users WHERE username = p_username LIMIT 1;
$$;


ALTER FUNCTION "public"."find_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_family_by_code"("p_code" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT family_id FROM public.users WHERE secret_code = p_code LIMIT 1;
$$;


ALTER FUNCTION "public"."find_family_by_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_household_code"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT secret_code FROM public.users
  WHERE family_id = (SELECT family_id FROM public.users WHERE id = auth.uid())
    AND secret_code IS NOT NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_household_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_taken"("p_username" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE username = p_username);
$$;


ALTER FUNCTION "public"."is_username_taken"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_child_family UUID;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can mark rewards as given';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_tx.type IS DISTINCT FROM 'debit' OR v_tx.reward_id IS NULL THEN
    RAISE EXCEPTION 'not a reward redemption';
  END IF;

  SELECT family_id INTO v_child_family FROM public.users WHERE id = v_tx.user_id;
  IF v_child_family IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'redemption is not in your household';
  END IF;

  -- idempotent: a second tap keeps the original hand-over time
  UPDATE public.transactions SET given_at = COALESCE(given_at, NOW()) WHERE id = p_transaction_id;
END;
$$;


ALTER FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_child public.users%ROWTYPE;
  v_reward public.rewards%ROWTYPE;
  v_owner public.users%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_child FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF v_child.role IS DISTINCT FROM 'child' OR v_child.family_id IS NULL THEN
    RAISE EXCEPTION 'only a child in a household can redeem rewards';
  END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id;
  IF NOT FOUND OR v_reward.archived THEN RAISE EXCEPTION 'reward not available'; END IF;

  SELECT * INTO v_owner FROM public.users WHERE id = v_reward.created_by;
  IF v_owner.family_id IS DISTINCT FROM v_child.family_id THEN
    RAISE EXCEPTION 'reward is not in your household';
  END IF;

  -- only parent-made rewards with a real price can be redeemed - also
  -- covers any child-made or zero/negative-price rows from before this fix
  IF v_owner.role IS DISTINCT FROM 'parent' OR v_reward.point_cost IS NULL OR v_reward.point_cost <= 0 THEN
    RAISE EXCEPTION 'reward not available';
  END IF;

  IF COALESCE(v_child.current_balance, 0) < v_reward.point_cost THEN
    RAISE EXCEPTION 'not enough points';
  END IF;

  INSERT INTO public.transactions (user_id, reward_id, amount, type)
  VALUES (v_child.id, p_reward_id, v_reward.point_cost, 'debit');

  UPDATE public.users
  SET current_balance = COALESCE(current_balance, 0) - v_reward.point_cost
  WHERE id = v_child.id
  RETURNING current_balance INTO v_balance;

  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_child public.users%ROWTYPE;
  v_chore public.chores%ROWTYPE;
  v_before_key TEXT;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can reject chores';
  END IF;

  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chore not found'; END IF;

  SELECT * INTO v_child FROM public.users WHERE id = v_chore.assigned_to;
  IF v_child.family_id IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'chore is not in your household';
  END IF;

  IF v_chore.status <> 'completed' THEN
    RAISE EXCEPTION 'chore is not waiting for approval';
  END IF;

  UPDATE public.chores SET status = 'pending', ai_verified = false WHERE id = p_chore_id;

  -- open attempt row: the child's next after photo fills it in, and the note shows on their camera screen
  SELECT before_image_key INTO v_before_key
  FROM public.chore_analysis
  WHERE chore_id = p_chore_id
  ORDER BY created_at ASC
  LIMIT 1;

  INSERT INTO public.chore_analysis (chore_id, before_image_key, ai_feedback, needs_revision)
  VALUES (p_chore_id, v_before_key, COALESCE(NULLIF(TRIM(p_note), ''), 'your parent asked you to redo this. take a new after photo.'), true);
END;
$$;


ALTER FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_chore"("p_chore_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_chore public.chores%ROWTYPE;
BEGIN
  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND OR v_chore.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'chore not found';
  END IF;

  IF v_chore.status IS DISTINCT FROM 'todo' THEN
    RAISE EXCEPTION 'this chore has already been started';
  END IF;

  -- the app inserts the before-photo chore_analysis row right before this
  IF NOT EXISTS (
    SELECT 1 FROM public.chore_analysis
    WHERE chore_id = p_chore_id AND before_image_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'take a before photo first';
  END IF;

  UPDATE public.chores SET status = 'pending' WHERE id = p_chore_id;
END;
$$;


ALTER FUNCTION "public"."start_chore"("p_chore_id" bigint) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chore_analysis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chore_id" bigint,
    "before_image_key" "text",
    "after_image_key" "text",
    "ai_detected_label" "text",
    "ai_confidence_score" numeric,
    "ai_feedback" "text",
    "needs_revision" boolean DEFAULT false,
    "attempt_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chore_analysis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" bigint NOT NULL,
    "created_by" "uuid",
    "assigned_to" "uuid",
    "approved_by" "uuid",
    "status" "text" DEFAULT 'todo'::"text",
    "title" "text",
    "steps" "text",
    "due_date" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "reward_amount" numeric DEFAULT '0'::numeric,
    "target_label" "text",
    "ai_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone,
    "description" "text"
);


ALTER TABLE "public"."chores" OWNER TO "postgres";


ALTER TABLE "public"."chores" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" NOT NULL
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "point_cost" numeric,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chore_id" bigint,
    "amount" numeric DEFAULT '0'::numeric,
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reward_id" "uuid",
    "given_at" timestamp with time zone
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "family_id" "uuid",
    "role" "text",
    "username" "text",
    "avatar_url" "text",
    "current_balance" numeric DEFAULT '0'::numeric,
    "created_at" timestamp with time zone,
    "secret_code" "text",
    "display_name" "text",
    "email" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chore_analysis"
    ADD CONSTRAINT "chore_analysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."rewards"
    ADD CONSTRAINT "rewards_point_cost_positive" CHECK (("point_cost" > (0)::numeric)) NOT VALID;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_secret_code_key" UNIQUE ("secret_code");



ALTER TABLE ONLY "public"."chore_analysis"
    ADD CONSTRAINT "chore_analysis_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow users to insert their own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Strict child analysis submission" ON "public"."chore_analysis" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = ( SELECT "chores"."assigned_to"
   FROM "public"."chores"
  WHERE ("chores"."id" = "chore_analysis"."chore_id"))));



CREATE POLICY "View analysis history" ON "public"."chore_analysis" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = ( SELECT "chores"."assigned_to"
   FROM "public"."chores"
  WHERE ("chores"."id" = "chore_analysis"."chore_id"))) OR ("auth"."uid"() = ( SELECT "chores"."created_by"
   FROM "public"."chores"
  WHERE ("chores"."id" = "chore_analysis"."chore_id")))));



CREATE POLICY "children can update their analysis rows" ON "public"."chore_analysis" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = ( SELECT "chores"."assigned_to"
   FROM "public"."chores"
  WHERE ("chores"."id" = "chore_analysis"."chore_id"))));



ALTER TABLE "public"."chore_analysis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "household members can view their family's rewards" ON "public"."rewards" FOR SELECT TO "authenticated" USING (("created_by" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."family_id" = "public"."current_family_id"()))));



CREATE POLICY "household members can view their family's transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."family_id" = "public"."current_family_id"()))));



CREATE POLICY "parents can create chores for their own kids" ON "public"."chores" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("assigned_to" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."family_id" = "public"."current_family_id"()) AND ("users"."role" = 'child'::"text")))) AND ("status" = 'todo'::"text") AND ("ai_verified" IS NOT TRUE) AND ("approved_by" IS NULL) AND ("approved_at" IS NULL) AND ("submitted_at" IS NULL)));



CREATE POLICY "parents can create rewards for their own family" ON "public"."rewards" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("public"."current_family_id"() IS NOT NULL) AND ("point_cost" > (0)::numeric)));



CREATE POLICY "parents can delete chores they created" ON "public"."chores" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "parents can update chores they created" ON "public"."chores" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by")) WITH CHECK ((("auth"."uid"() = "created_by") AND ("assigned_to" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."family_id" = "public"."current_family_id"()) AND ("users"."role" = 'child'::"text"))))));



CREATE POLICY "parents can update their family's rewards" ON "public"."rewards" FOR UPDATE TO "authenticated" USING (((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("created_by" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."family_id" = "public"."current_family_id"()) AND ("users"."role" = 'parent'::"text")))))) WITH CHECK (((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("created_by" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE (("users"."family_id" = "public"."current_family_id"()) AND ("users"."role" = 'parent'::"text")))) AND ("point_cost" > (0)::numeric)));



CREATE POLICY "parents can view their family's chore analysis" ON "public"."chore_analysis" FOR SELECT TO "authenticated" USING (((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("chore_id" IN ( SELECT "chores"."id"
   FROM "public"."chores"
  WHERE ("chores"."assigned_to" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."family_id" = "public"."current_family_id"())))))));



CREATE POLICY "parents can view their family's chores" ON "public"."chores" FOR SELECT TO "authenticated" USING (((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'parent'::"text") AND ("assigned_to" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."family_id" = "public"."current_family_id"())))));



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can create a family rooted at their own id" ON "public"."families" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users can update their own data" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users can view their own chores" ON "public"."chores" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "assigned_to") OR ("auth"."uid"() = "created_by")));



CREATE POLICY "users can view their own row or their family's" ON "public"."users" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("family_id" = "public"."current_family_id"())));



CREATE POLICY "users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chore_analysis";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chores";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."approve_chore"("p_chore_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_chore"("p_chore_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."approve_chore"("p_chore_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_chore"("p_chore_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."current_family_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_family_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_family_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_email_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_family_by_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_family_by_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_family_by_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_household_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_household_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_household_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_username_taken"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_taken"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_taken"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_reward_given"("p_transaction_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_chore"("p_chore_id" bigint, "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_chore"("p_chore_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_chore"("p_chore_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_chore"("p_chore_id" bigint) TO "service_role";


















GRANT ALL ON TABLE "public"."chore_analysis" TO "anon";
GRANT ALL ON TABLE "public"."chore_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."chore_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































