"""Send branded business welcome email"""
import smtplib, ssl, os, sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

sys.path.insert(0, "/opt/silkweb")
import dotenv
dotenv.load_dotenv("/opt/silkweb/.env")

smtp_user = os.getenv("SMTP_USER", "information@silkweb.io")
smtp_pass = os.getenv("SMTP_PASSWORD", "")
to_email = sys.argv[1] if len(sys.argv) > 1 else "information@silkweb.io"
user_name = sys.argv[2] if len(sys.argv) > 2 else "there"

html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a12;border-radius:20px;overflow:hidden;border:1px solid #1a1a2e;">

<tr><td style="background:linear-gradient(135deg,#1a1a3e,#0a0a14);padding:50px 40px 40px;text-align:center;">
<img src="https://silkweb.io/logo.png" width="56" height="56" style="border-radius:12px;margin-bottom:20px;" alt="SilkWeb"/>
<h1 style="margin:0;font-size:30px;font-weight:700;color:#fff;">Welcome, {user_name}!</h1>
<p style="margin:10px 0 0;font-size:15px;color:#94A3B8;">Your business is now on the AI Search Engine.</p>
</td></tr>

<tr><td style="padding:40px;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#111128,#0d0d1e);border:1px solid #252550;border-radius:16px;margin-bottom:32px;">
<tr><td style="padding:30px;text-align:center;">
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#e2e8f0;">AI can now find your business</h2>
<p style="margin:0;font-size:14px;color:#94A3B8;line-height:1.7;">When someone asks ChatGPT, Claude, Gemini, or any AI for a service in your industry and area, they can now find and recommend <strong style="color:#fff;">you</strong>.</p>
</td></tr>
</table>

<p style="margin:0 0 20px;font-size:11px;color:#6366F1;letter-spacing:2px;text-transform:uppercase;font-weight:600;">WHAT HAPPENS NEXT</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr>
<td width="50" style="vertical-align:top;padding-right:16px;">
<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#1e1e40,#15153a);border:1px solid #2a2a50;text-align:center;line-height:44px;font-size:18px;">1</div>
</td>
<td style="vertical-align:top;">
<p style="margin:0;font-size:15px;font-weight:600;color:#e2e8f0;">AI searches find you</p>
<p style="margin:4px 0 0;font-size:13px;color:#94A3B8;">Your profile is indexed across AI platforms. No ads needed.</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr>
<td width="50" style="vertical-align:top;padding-right:16px;">
<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#1e1e40,#15153a);border:1px solid #2a2a50;text-align:center;line-height:44px;font-size:18px;">2</div>
</td>
<td style="vertical-align:top;">
<p style="margin:0;font-size:15px;font-weight:600;color:#e2e8f0;">20 AI agents work for you</p>
<p style="margin:4px 0 0;font-size:13px;color:#94A3B8;">Security, legal, finance, marketing, and more. Use any agent anytime.</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr>
<td width="50" style="vertical-align:top;padding-right:16px;">
<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#1e1e40,#15153a);border:1px solid #2a2a50;text-align:center;line-height:44px;font-size:18px;">3</div>
</td>
<td style="vertical-align:top;">
<p style="margin:0;font-size:15px;font-weight:600;color:#e2e8f0;">Get verified confirmations</p>
<p style="margin:4px 0 0;font-size:13px;color:#94A3B8;">Every agent interaction sends you a verified receipt.</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="https://silkweb.io/agents/" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">Explore Your Agents</a>
</td></tr>
</table>

</td></tr>

<tr><td style="padding:0 40px 40px;">
<p style="margin:0 0 16px;font-size:11px;color:#6366F1;letter-spacing:2px;text-transform:uppercase;font-weight:600;">AGENTS READY FOR YOUR BUSINESS</p>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="48%" style="padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;vertical-align:top;">
<div style="width:28px;height:28px;border-radius:7px;background:#3B82F6;margin-bottom:8px;"></div>
<p style="margin:0;font-size:14px;font-weight:600;color:#fff;">Guardian</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748B;">Protects your online presence</p>
</td>
<td width="4%"></td>
<td width="48%" style="padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;vertical-align:top;">
<div style="width:28px;height:28px;border-radius:7px;background:#EC4899;margin-bottom:8px;"></div>
<p style="margin:0;font-size:14px;font-weight:600;color:#fff;">Muse</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748B;">Writes your marketing content</p>
</td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
<tr>
<td width="48%" style="padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;vertical-align:top;">
<div style="width:28px;height:28px;border-radius:7px;background:#DC2626;margin-bottom:8px;"></div>
<p style="margin:0;font-size:14px;font-weight:600;color:#fff;">Counsel</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748B;">Reviews your contracts</p>
</td>
<td width="4%"></td>
<td width="48%" style="padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;vertical-align:top;">
<div style="width:28px;height:28px;border-radius:7px;background:#22C55E;margin-bottom:8px;"></div>
<p style="margin:0;font-size:14px;font-weight:600;color:#fff;">Healer</p>
<p style="margin:4px 0 0;font-size:12px;color:#64748B;">Health guidance for your team</p>
</td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
<tr><td align="center">
<a href="https://silkweb.io/agents/" style="color:#6366F1;font-size:13px;text-decoration:none;font-weight:500;">See all 20 agents &rarr;</a>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 40px 40px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#111128,#0d0d1e);border:1px solid #252550;border-radius:14px;">
<tr><td style="padding:24px;text-align:center;">
<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#e2e8f0;">Complete your business profile</p>
<p style="margin:0 0 16px;font-size:13px;color:#94A3B8;">Add your location, website, and services so AI recommends you more accurately.</p>
<a href="https://silkweb.io/onboarding.html" style="display:inline-block;padding:10px 28px;background:#1e1e3a;border:1px solid #3a3a6a;color:#fff;font-size:13px;font-weight:500;text-decoration:none;border-radius:8px;">Complete Profile &rarr;</a>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:28px 40px;border-top:1px solid #1a1a2e;text-align:center;">
<img src="https://silkweb.io/logo.png" width="24" height="24" style="border-radius:5px;margin-bottom:10px;" alt=""/>
<p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#94A3B8;">SilkWeb &mdash; The AI Search Engine</p>
<p style="margin:0 0 12px;font-size:12px;color:#475569;">silkweb.io</p>
<p style="margin:0;font-size:11px;color:#334155;">2026 SilkWeb Protocol &bull; Armstrong Alliance Group</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

msg = MIMEMultipart("alternative")
msg["Subject"] = f"Welcome to SilkWeb, {user_name} - Your Business Is Now Searchable by AI"
msg["From"] = "SilkWeb <information@silkweb.io>"
msg["To"] = to_email

plain = f"Welcome {user_name}! Your business is now searchable by AI on SilkWeb. Visit silkweb.io/agents to explore your 20 AI agents."
msg.attach(MIMEText(plain, "plain"))
msg.attach(MIMEText(html, "html"))

ctx = ssl.create_default_context()
with smtplib.SMTP_SSL("smtp.hostinger.com", 465, context=ctx) as s:
    s.login(smtp_user, smtp_pass)
    s.sendmail(smtp_user, to_email, msg.as_string())
print(f"Welcome email sent to {to_email}")
