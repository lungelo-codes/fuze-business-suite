import { NextResponse } from "next/server";

// Temporary stub for syncing contacts with Google Contacts. A connector for
// Google Contacts is not currently enabled, so this endpoint simply
// acknowledges the request and informs the caller that no action will be
// performed. Once a Google Contacts connector is available via the API
// tool, this implementation can be extended to fetch and sync contacts.

export async function POST() {
  return NextResponse.json({
    error: "Google Contacts connector is not enabled. Please enable it in your tenant settings to sync contacts.",
  }, { status: 501 });
}