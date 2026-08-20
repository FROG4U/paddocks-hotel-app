import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiConfigured, buildHotelBrief, chatReply, type ChatTurn } from "@/lib/ai";

export const dynamic = "force-dynamic";

// A visitor cannot send more than this in one conversation. Stops a single
// tab running up a bill, and no genuine enquiry needs more.
const MAX_TURNS = 30;

// And no more than this from one address per hour, so nobody can open a
// hundred conversations and run up the API bill.
const PER_IP_PER_HOUR = 60;
const seen = new Map<string, number[]>();

function overLimit(ip: string) {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const hits = (seen.get(ip) || []).filter((t) => t > cutoff);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear(); // keep the map from growing forever
  return hits.length > PER_IP_PER_HOUR;
}

export async function POST(req: NextRequest) {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!s?.chatEnabled) {
    return NextResponse.json({ error: "Chat is switched off." }, { status: 404 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip") || "unknown";
  if (overLimit(ip)) {
    return NextResponse.json({
      reply: `We have chatted a lot today. Please call us on ${s.phone} or email ${s.email} and the team will help.`,
      conversationId: null,
    });
  }

  let payload: { conversationId?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const text = (payload.message || "").toString().trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  // No API key: rather than lose the question, drop it into the Messages
  // inbox so the hotel can follow it up.
  if (!aiConfigured()) {
    await prisma.message.create({
      data: {
        name: "Website visitor", subject: "Chat question",
        body: text, source: "chat",
      },
    });
    return NextResponse.json({
      reply: `Thank you, I have passed that to the team. For anything urgent please call ${s.phone} or email ${s.email}.`,
      conversationId: null,
    });
  }

  // Find or start the conversation.
  let conversation = payload.conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: payload.conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;
  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {},
      include: { messages: true },
    });
  }

  if (conversation.messages.filter((m) => m.role === "user").length >= MAX_TURNS) {
    return NextResponse.json({
      reply: `We have covered a lot here. Please call us on ${s.phone} or email ${s.email} and a member of the team will pick it up.`,
      conversationId: conversation.id,
    });
  }

  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "user", text },
  });

  const history: ChatTurn[] = [
    ...conversation.messages.map((m) => ({ role: m.role as "user" | "assistant", text: m.text })),
    { role: "user", text },
  ];

  let reply: string;
  try {
    const brief = await buildHotelBrief();
    reply = await chatReply(history, brief, s.chatName);
  } catch {
    reply = `Sorry, I am having trouble just now. Please call us on ${s.phone} or email ${s.email}.`;
  }

  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, role: "assistant", text: reply },
  });
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ reply, conversationId: conversation.id });
}
