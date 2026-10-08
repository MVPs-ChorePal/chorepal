import { createRequestClient } from "@/utils/supabaseServer";

// GET /api/chores - chores visible to the caller. Scoping (own chores vs.
// family's chores) is enforced by RLS, not by this handler.
export async function GET(request: Request) {
  const supabase = createRequestClient(request);

  const { data, error } = await supabase
    .from("chores")
    .select("id, title, description, status, reward_amount, due_date, target_label, assigned_to")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ chores: data });
}

// POST /api/chores - create one chore row per id in assigned_to.
// created_by is taken from the caller's own token, never from the body.
export async function POST(request: Request) {
  const supabase = createRequestClient(request);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not authenticated" }, { status: 401 });

  const body = await request.json();
  const { title, description, reward_amount, target_label, due_date, assigned_to } = body;

  if (!title || !Array.isArray(assigned_to) || assigned_to.length === 0) {
    return Response.json({ error: "title and assigned_to are required" }, { status: 400 });
  }

  const choreRows = assigned_to.map((childId: string) => ({
    title,
    description,
    reward_amount: reward_amount ?? 500,
    assigned_to: childId,
    created_by: user.id,
    status: "pending",
    target_label,
    due_date,
  }));

  const { data, error } = await supabase.from("chores").insert(choreRows).select();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ chores: data }, { status: 201 });
}
