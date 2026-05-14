import { NextResponse } from "next/server";
import { BusinessSuiteError } from "@/lib/server/erpnext";
import { envelope, errorMessage, getWorkspace } from "@/lib/server/businessApi";

export async function GET(_req: Request, { params }: { params: { workspace: string } }) {
  try {
    const data = await getWorkspace(params.workspace);
    return NextResponse.json(envelope(data));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: errorMessage(error, "Could not load workspace"), data: null },
      { status: error instanceof BusinessSuiteError ? error.status : 500 }
    );
  }
}
