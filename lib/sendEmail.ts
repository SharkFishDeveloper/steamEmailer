import { EmailGame } from "@/types"; 

export async function sendEmail(
  games: EmailGame[],
  apiKey: string,
  toEmail: string
): Promise<boolean> {
  try {
    const gameRows = games
      .map((g) => {
        const reasons = g.reasons
          .map((r) =>
            r === "target_reached" ? "✅ Target reached" : "📉 Price dropped"
          )
          .join(", ");

        const previousInfo =
          g.previousPrice != null
            ? `<br/><small style="color:#888">Previous: ₹${g.previousPrice}</small>`
            : "";

        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee">${g.name}</td>
            <td style="padding:12px;border-bottom:1px solid #eee">₹${g.currentPrice}${previousInfo}</td>
            <td style="padding:12px;border-bottom:1px solid #eee">${g.discount}% off</td>
            <td style="padding:12px;border-bottom:1px solid #eee">₹${g.targetPrice}</td>
            <td style="padding:12px;border-bottom:1px solid #eee">${reasons}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <h2>🎮 Steam Price Alert</h2>
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif">
        <thead>
          <tr style="background:#1b2838;color:white">
            <th style="padding:12px;text-align:left">Game</th>
            <th style="padding:12px;text-align:left">Current Price</th>
            <th style="padding:12px;text-align:left">Discount</th>
            <th style="padding:12px;text-align:left">Target</th>
            <th style="padding:12px;text-align:left">Reason</th>
          </tr>
        </thead>
        <tbody>${gameRows}</tbody>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "steamtracker@codeheroes.store",
        to: [toEmail],
        subject: `🎮 Steam Price Alert — ${games.length} game(s) on sale`,
        html,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}