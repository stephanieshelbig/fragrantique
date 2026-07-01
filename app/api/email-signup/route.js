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

    const alreadySignedUp = error?.code === "23505";

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
      subject: alreadySignedUp
        ? "Duplicate Fragrantique Email Signup"
        : "New Fragrantique Email Signup",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>${
            alreadySignedUp
              ? "Duplicate Fragrantique Email Signup"
              : "New Fragrantique Email Signup"
          }</h2>
          <p>
            ${
              alreadySignedUp
                ? "Someone tried to sign up again for the Fragrantique promotional email list."
                : "Someone signed up for the Fragrantique promotional email list."
            }
          </p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });

    if (!alreadySignedUp) {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.GMAIL_USER,
        to: email,
        subject: "Welcome to Fragrantique 💕",
        html: `
          <div style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #182A39; background: #fff7ec; padding: 24px;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #d9c39a; border-radius: 18px; padding: 28px;">
              <h2 style="color: #182A39; text-align: center; margin-top: 0;">
                Welcome to Fragrantique 💕
              </h2>

              <p>Thank you so much for joining the Fragrantique list!</p>

              <p>
                You’ll receive updates about new fragrances, special offers,
                discovery sets, and Fragrantique news.
              </p>

              <p>I’m so happy you’re here.</p>

              <p style="margin-bottom: 0;">
                Stephanie<br />
                <strong>Fragrantique.net</strong>
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      alreadySignedUp,
    });
  } catch (error) {
    console.error("Email signup error:", error);

    return NextResponse.json(
      { error: "Unable to complete signup." },
      { status: 500 }
    );
  }
}
