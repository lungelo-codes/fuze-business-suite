import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

/** DELETE /api/crm/notes/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const result = await erpMethod("crm.delete_note", { note: params.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete note" },
      { status: 500 }
    );
  }
}
