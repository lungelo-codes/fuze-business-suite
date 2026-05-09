import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Record detail must be exposed through a controlled fuze_suite.api method before this screen can load it." },
    { status: 501 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Record updates must be exposed through a controlled fuze_suite.api method before this action is enabled." },
    { status: 501 }
  );
}
