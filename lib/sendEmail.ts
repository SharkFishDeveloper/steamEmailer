import { EmailGame } from "@/types";

export async function sendEmail(
  games: EmailGame[],
  apiKey: string,
  toEmail: string
): Promise<boolean> {
  try {
    const gameCards = games
      .map((g) => {
        const reasons = g.reasons
          .map((r) =>
            r === "target_reached"
              ? "✅ Target reached"
              : "📉 Price dropped"
          )
          .join(", ");

        const previousPriceSection =
          g.previousPrice != null
            ? `
              <tr>
                <td style="padding-top:6px;color:#666;font-size:14px;">
                  Previous Price: ₹${g.previousPrice}
                </td>
              </tr>
            `
            : "";

        return `
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              margin-bottom:24px;
              border:1px solid #e5e7eb;
              border-radius:12px;
              overflow:hidden;
              background:#ffffff;
            "
          >
            <tr>
              <td>
                <img
                  src="${g.imageUrl}"
                  alt="${g.name}"
                  width="100%"
                  style="
                    display:block;
                    width:100%;
                    max-width:100%;
                    height:auto;
                  "
                />
              </td>
            </tr>

            <tr>
              <td style="padding:18px;">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td
                      style="
                        font-size:22px;
                        font-weight:bold;
                        color:#111827;
                        padding-bottom:12px;
                      "
                    >
                      ${g.name}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        font-size:16px;
                        color:#111827;
                        padding-bottom:6px;
                      "
                    >
                      <strong>Current Price:</strong>
                      ₹${g.currentPrice}
                    </td>
                  </tr>

                  ${previousPriceSection}

                  <tr>
                    <td
                      style="
                        font-size:16px;
                        color:#111827;
                        padding-top:6px;
                        padding-bottom:6px;
                      "
                    >
                      <strong>Discount:</strong>
                      ${g.discount}% off
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        font-size:16px;
                        color:#111827;
                        padding-bottom:6px;
                      "
                    >
                      <strong>Target Price:</strong>
                      ₹${g.targetPrice}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        font-size:16px;
                        color:#111827;
                        padding-bottom:6px;
                      "
                    >
                      <strong>Alert:</strong>
                      ${reasons}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </head>

        <body
          style="
            margin:0;
            padding:20px;
            background:#f3f4f6;
            font-family:Arial,Helvetica,sans-serif;
          "
        >
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
          >
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    max-width:700px;
                    background:#ffffff;
                    border-radius:12px;
                    overflow:hidden;
                  "
                >
                  <tr>
                    <td
                      style="
                        background:#1b2838;
                        color:#ffffff;
                        padding:24px;
                        text-align:center;
                      "
                    >
                      <h1
                        style="
                          margin:0;
                          font-size:28px;
                        "
                      >
                        🎮 Steam Price Alert
                      </h1>

                      <p
                        style="
                          margin-top:10px;
                          margin-bottom:0;
                          color:#d1d5db;
                          font-size:15px;
                        "
                      >
                        ${games.length} game(s) triggered an alert
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:20px;">
                      ${gameCards}
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:20px;
                        text-align:center;
                        color:#6b7280;
                        font-size:13px;
                        border-top:1px solid #e5e7eb;
                      "
                    >
                      Steam Price Tracker
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "tracker@codeheroes.store",
        to: [toEmail],
        subject: `🎮 Steam Price Alert — ${games.length} game(s)`,
        html,
      }),
    });

    const data = await res.json();

    console.log("📨 Resend response:", data);

    if (!res.ok || !data?.id) {
      console.error("❌ Email failed:", data);
      return false;
    }

    console.log("✅ Email accepted by Resend:", data.id);
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}