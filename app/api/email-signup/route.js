import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("promotional_email_signups")
      .insert([{ email }]);

    if (error && error.code !== "23505") {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.GMAIL_USER,
      to: "stephanieshelbig@gmail.com",
      subject: "New Fragrantique Email Signup",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Fragrantique Email Signup</h2>
          <p>Someone signed up for the Fragrantique promotional email list.</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      alreadySignedUp: error?.code === "23505",
    });
  } catch (error) {
    console.error("Email signup error:", error);

    return NextResponse.json(
      { error: "Unable to complete signup." },
      { status: 500 }
    );
  }
}
