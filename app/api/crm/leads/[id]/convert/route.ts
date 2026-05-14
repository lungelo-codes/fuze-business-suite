import { NextResponse } from "next/server";
import { BusinessSuiteError } from "@/lib/server/erpnext";
import { convertLeadToCustomer, envelope, errorMessage } from "@/lib/server/businessApi";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await convertLeadToCustomer(params.id);
    return NextResponse.json(envelope(data, "Lead converted to customer"));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: errorMessage(error, "Could not convert lead"), data: null },
      { status: error instanceof BusinessSuiteError ? error.status : 500 }
    );
  }
}
