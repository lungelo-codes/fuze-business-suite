import { NextResponse } from "next/server";
import { BusinessSuiteError } from "@/lib/server/erpnext";
import { envelope, errorMessage, submitDocument } from "@/lib/server/businessApi";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await submitDocument("Quotation", params.id);
    return NextResponse.json(envelope(data, "Quote submitted and ready to send"));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: errorMessage(error, "Could not send quote"), data: null },
      { status: error instanceof BusinessSuiteError ? error.status : 500 }
    );
  }
}
