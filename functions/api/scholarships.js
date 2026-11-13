export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return Response.json({ error: "Database binding DB is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const educationLevel = (url.searchParams.get("education_level") || "").trim().slice(0, 80);
  const category = (url.searchParams.get("category") || "").trim().slice(0, 80);
  const state = (url.searchParams.get("state") || "").trim().slice(0, 80);

  const conditions = [];
  const values = [];

  if (query) {
    const pattern = `%${query}%`;
    conditions.push("(name LIKE ? OR provider LIKE ? OR description LIKE ? OR field_of_study LIKE ? OR eligibility LIKE ?)");
    values.push(pattern, pattern, pattern, pattern, pattern);
  }

  if (educationLevel && educationLevel !== "all") {
    conditions.push("(education_level = ? OR education_level = 'All education levels')");
    values.push(educationLevel);
  }

  if (category && category !== "all") {
    conditions.push("category = ?");
    values.push(category);
  }

  if (state && state !== "all") {
    conditions.push("(state = ? OR state = 'All states')");
    values.push(state);
  }

  let sql = `
    SELECT
      id, name, provider, description, amount, deadline,
      education_level, field_of_study, state, eligibility,
      application_url, category
    FROM scholarships
  `;

  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY CASE WHEN deadline IS NULL OR deadline = '' THEN 1 ELSE 0 END, deadline ASC, name ASC LIMIT 100";

  try {
    const result = await env.DB.prepare(sql).bind(...values).all();
    return Response.json({
      scholarships: result.results || [],
      count: (result.results || []).length
    }, {
      headers: {
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (error) {
    return Response.json({ error: "Unable to search scholarships right now." }, { status: 500 });
  }
}
