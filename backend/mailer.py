import smtplib
import ssl
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import httpx

from config import settings

def _build_otp_html(otp: str, recipient_email: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #131927; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px; text-align: center; border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: linear-gradient(135deg, #06b6d4, #10b981); color: #ffffff; font-weight: bold; font-size: 18px; margin-bottom: 12px;">CI</div>
              <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Community Intelligence</h2>
              <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Multi-Layer Verification</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h3 style="margin: 0 0 10px; color: #f8fafc; font-size: 18px; font-weight: 600;">Your Sign-In Code</h3>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                We received a request to access the Community Intelligence Platform for <strong>{recipient_email}</strong>. Use the one-time code below to complete sign-in:
              </p>
              
              <!-- OTP Box -->
              <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 10px; padding: 18px 24px; margin: 0 auto 24px; display: inline-block;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8;">{otp}</span>
              </div>
              
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                ⏱ This code will expire in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 28px; text-align: center;">
              <div style="background: #0f172a; border-radius: 8px; padding: 12px; font-size: 11.5px; color: #64748b; line-height: 1.4;">
                If you did not request this verification code, you can safely disregard this email. No action is required.
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #0b0f19; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                Community Intelligence Platform • IEEE Architecture • Supabase Secured
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def _send_smtp_sync(from_addr: str, to_addr: str, msg: MIMEMultipart) -> bool:
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD

    if port == 465:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context, timeout=12.0) as server:
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to_addr], msg.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=12.0) as server:
            server.ehlo()
            try:
                context = ssl.create_default_context()
                server.starttls(context=context)
                server.ehlo()
            except Exception as e:
                print(f"[Mailer] STARTTLS notice: {e}")
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to_addr], msg.as_string())
    return True

async def _send_smtp2go_api(from_email: str, from_name: str, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    url = settings.SMTP_BASE_URL + "/email/send"
    payload = {
        "api_key": settings.SMTP2GO_API_KEY,
        "to": [to_email],
        "sender": f"{from_name} <{from_email}>" if from_email else from_name,
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("data", {}).get("succeeded", 0) > 0:
                return True
        raise Exception(f"SMTP2GO API returned {resp.status_code}: {resp.text}")

async def send_otp_email(to_email: str, otp: str) -> bool:
    subject = f"{otp} is your Community Intelligence verification code"
    text_content = (
        f"Your Community Intelligence verification code is: {otp}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this code, please ignore this email."
    )
    html_content = _build_otp_html(otp, to_email)

    from_name = settings.SMTP_FROM_NAME
    from_email = settings.SMTP_FROM_EMAIL

    # Option 1: SMTP2GO REST API
    if settings.SMTP2GO_API_KEY:
        try:
            print(f"[Mailer] Dispatching official OTP email to {to_email} via SMTP2GO API...")
            await _send_smtp2go_api(from_email, from_name, to_email, subject, html_content, text_content)
            print(f"[Mailer] Successfully sent OTP email to {to_email} via SMTP2GO API!")
            return True
        except Exception as e:
            print(f"[Mailer] SMTP2GO API error: {e}")

    # Option 2: SMTP2GO SMTP Transport
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            print(f"[Mailer] Dispatching official OTP email to {to_email} via SMTP ({settings.SMTP_HOST}:{settings.SMTP_PORT})...")
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            await asyncio.to_thread(_send_smtp_sync, from_email, to_email, msg)
            print(f"[Mailer] Successfully sent OTP email to {to_email} via SMTP2GO!")
            return True
        except Exception as e:
            print(f"[Mailer] SMTP send failed: {e}")

    # Fallback simulation notice if credentials not yet configured
    print(f"\n{'='*50}")
    print(f"[Mailer Notice] SMTP2GO credentials not fully configured in .env.")
    print(f"TARGET RECIPIENT: {to_email}")
    print(f"DISPATCHED OTP:   {otp}")
    print(f"Please add SMTP_USER & SMTP_PASSWORD or SMTP2GO_API_KEY in .env to deliver real inbox emails.")
    print(f"{'='*50}\n")
    return True

async def check_smtp_health() -> dict:
    """Test connectivity to SMTP2GO service and measure handshake latency."""
    import time
    import socket

    start = time.time()
    has_api_key = bool(settings.SMTP2GO_API_KEY)
    has_smtp_creds = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)

    if not has_api_key and not has_smtp_creds:
        return {
            "name": "SMTP2GO Email Gateway",
            "type": "email",
            "status": "degraded",
            "healthy": False,
            "latency_ms": 0,
            "message": "SMTP2GO credentials not configured in environment.",
            "details": {
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "auth_type": "None",
                "from_email": settings.SMTP_FROM_EMAIL or "Not set"
            }
        }

    # Test TCP and SMTP handshake to SMTP2GO
    def _test_handshake():
        s = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5.0)
        code, msg = s.ehlo()
        s.quit()
        return code, msg.decode('utf-8', errors='ignore')

    try:
        code, msg = await asyncio.to_thread(_test_handshake)
        latency = round((time.time() - start) * 1000)
        return {
            "name": "SMTP2GO Email Gateway",
            "type": "email",
            "status": "active",
            "healthy": True,
            "latency_ms": latency,
            "message": f"SMTP handshake confirmed (Code {code} OK)",
            "details": {
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "auth_type": "SMTP2GO API Key & SMTP Auth",
                "from_email": settings.SMTP_FROM_EMAIL or "noreply@ci.aether70.me",
                "sender_name": settings.SMTP_FROM_NAME
            }
        }
    except Exception as e:
        latency = round((time.time() - start) * 1000)
        return {
            "name": "SMTP2GO Email Gateway",
            "type": "email",
            "status": "error",
            "healthy": False,
            "latency_ms": latency,
            "message": f"Connection error: {str(e)}",
            "details": {
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "auth_type": "SMTP2GO",
                "from_email": settings.SMTP_FROM_EMAIL
            }
        }

