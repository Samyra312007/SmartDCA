import { NextRequest, NextResponse }    from "next/server";
import {
  generateSpeech,
  generateAlertScript,
  DEFAULT_VOICE_ID,
  AlertType,
  AlertData,
}                                       from "@/lib/elevenlabs";
import { supabase }                     from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      data,
      strategyId,
      voiceId,
      customText,
    }: {
      type:        AlertType;
      data:        AlertData;
      strategyId?: string;
      voiceId?:    string;
      customText?: string;
    } = body;

    const script = customText ?? generateAlertScript(type, data);

    if (!script) {
      return NextResponse.json(
        { error: "Could not generate script" },
        { status: 400 }
      );
    }

    const audioBuffer = await generateSpeech(
      script,
      voiceId ?? DEFAULT_VOICE_ID
    );

    if (!audioBuffer) {
      return NextResponse.json(
        { error: "ElevenLabs API failed" },
        { status: 500 }
      );
    }

    if (strategyId) {
      supabase
        .from("voice_alerts")
        .insert([{
          strategy_id: strategyId,
          alert_type:  type,
          message:     script,
          played:      false,
        }])
        .then(() => {})
        .catch(() => {});
    }

    return new NextResponse(audioBuffer, {
      status:  200,
      headers: {
        "Content-Type":  "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });

  } catch (err: any) {
    console.error("Voice API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const strategyId = req.nextUrl.searchParams.get("strategyId");

  if (!strategyId) {
    return NextResponse.json(
      { error: "strategyId required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("voice_alerts")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ alerts: data });
}