import { NextResponse } from "next/server";
import { aiCoachSystemPrompt } from "@/lib/nexofit/ai-coach";

type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL ?? "anthropic/claude-haiku-5.5";

  if (!apiKey) {
    return NextResponse.json(
      { error: "A chave OPENROUTER_API_KEY ainda nao foi configurada no servidor." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    profile?: { name?: string; goal?: string; experience?: string; daysPerWeek?: number };
    messages?: CoachMessage[];
  };

  const profile = body.profile ?? {};
  const messages = (body.messages ?? []).slice(-12);
  const profileContext = `Perfil atual: nome=${profile.name || "nao informado"}; objetivo=${profile.goal || "nao informado"}; experiencia=${profile.experience || "nao informado"}; dias por semana=${profile.daysPerWeek ?? "nao informado"}.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "NexoFit",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: "system", content: `${aiCoachSystemPrompt}\n\n${profileContext}` },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nao foi possivel consultar o agente de IA agora." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  return NextResponse.json({
    content: typeof content === "string" ? content : "Nao consegui montar uma resposta agora. Tente novamente em instantes.",
    model,
  });
}
