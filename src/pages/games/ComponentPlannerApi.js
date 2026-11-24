export async function request_component_plan(
  brief,
  document,
  signal,
  guidance = [],
) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}api/component-construction/plan`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_version: 1,
        brief,
        document,
        ...(guidance.length ? { guidance } : {}),
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
    },
  );
  if (!response.ok) {
    let code;
    try {
      code = (await response.json()).error;
    } catch {
      /* bounded public error below */
    }
    const errors = {
      401: "planner_auth",
      403: "planner_auth",
      409: "proposal_stale",
      413: "planner_limit",
      429: "planner_busy",
      504: "planner_timeout",
    };
    throw new Error(
      code === "DEADLINE_EXCEEDED"
        ? "planner_timeout"
        : errors[response.status] || "planner_unavailable",
    );
  }
  return response.json();
}
