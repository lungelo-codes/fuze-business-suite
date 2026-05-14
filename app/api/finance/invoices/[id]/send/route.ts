import { NextResponse } from "next/server";
import { BusinessSuiteError } from "@/lib/server/erpnext";
import { envelope, errorMessage, submitDocument } from "@/lib/server/businessApi";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await submitDocument("Sales Invoice", params.id);
    return NextResponse.json(envelope(data, "Invoice submitted and ready to send"));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: errorMessage(error, "Could not send invoice"), data: null },
      { status: error instanceof BusinessSuiteError ? error.status : 500 }
    );
  }
}
