import { NextRequest, NextResponse } from "next/server";
import { buildIcsFile } from "@/lib/utils";
import { ScheduleItem } from "@/lib/types";

function readStringField(fields: Record<string, { stringValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> } }> | undefined, key: string) {
  return fields?.[key]?.stringValue ?? "";
}

function readStringArrayField(
  fields: Record<string, { stringValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> } }> | undefined,
  key: string
) {
  return fields?.[key]?.arrayValue?.values?.map((item) => item.stringValue ?? "").filter(Boolean) ?? [];
}

function toScheduleItem(document: { fields?: Record<string, { stringValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> } }> }): ScheduleItem {
  return {
    id: readStringField(document.fields, "id"),
    title: readStringField(document.fields, "title"),
    startAt: readStringField(document.fields, "startAt"),
    endAt: readStringField(document.fields, "endAt"),
    ownerUserId: readStringField(document.fields, "ownerUserId"),
    participantUserIds: readStringArrayField(document.fields, "participantUserIds"),
    facilityIds: [],
    memo: readStringField(document.fields, "memo"),
    visibility: (readStringField(document.fields, "visibility") as ScheduleItem["visibility"]) || "public",
    createdAt: readStringField(document.fields, "createdAt"),
    updatedAt: readStringField(document.fields, "updatedAt")
  };
}

async function fetchFirestore(path: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error("missing-firebase-config");
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const feed = await fetchFirestore(`CalendarFeeds/${token}`);

  if (!feed) {
    return new NextResponse("Not found", { status: 404 });
  }

  const feedItems = await fetchFirestore(`CalendarFeeds/${token}/Items`);
  const documents = Array.isArray(feedItems?.documents) ? feedItems.documents : [];
  const schedules = (documents as Array<{ fields?: Record<string, { stringValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> } }> }>)
    .map(toScheduleItem)
    .sort((left: ScheduleItem, right: ScheduleItem) => left.startAt.localeCompare(right.startAt));
  const calendarName = readStringField(feed.fields, "userName") || "個人予定";
  const body = buildIcsFile(schedules, `${calendarName} 予定`);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${encodeURIComponent(token)}.ics"`,
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
