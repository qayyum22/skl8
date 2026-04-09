export const dynamic = "force-dynamic";

function empty() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function GET() {
  return empty();
}

export function POST() {
  return empty();
}

export function OPTIONS() {
  return empty();
}
