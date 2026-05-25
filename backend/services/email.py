# backend/services/email.py
#
# Transactional email via Brevo (sendinblue) HTTP API.
# Chosen over Resend because Brevo allows single-sender verification —
# we can send from a verified gmail to any recipient without owning a domain.

import html
import re

import httpx

from core.config import settings


BREVO_API = "https://api.brevo.com/v3/smtp/email"


def _parse_sender(email_from: str) -> dict:
    """
    Turn 'Display Name <email@addr>' into Brevo's structured sender shape.
    Bare-email values fall back to a default display name.
    """
    m = re.match(r"^\s*(.+?)\s*<(.+?)>\s*$", email_from)
    if m:
        return {"name": m.group(1), "email": m.group(2)}
    return {"name": "EventHub", "email": email_from.strip()}


async def _send(to_email: str, subject: str, html_body: str) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            BREVO_API,
            headers={
                "api-key": settings.brevo_api_key,
                "accept": "application/json",
                "content-type": "application/json",
            },
            json={
                "sender": _parse_sender(settings.email_from),
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
            },
        )
        response.raise_for_status()


async def send_registration_confirmation(to_email: str, event_title: str, event_date: str):
    """Send confirmation email after student registers for an event."""
    safe_title = html.escape(event_title)
    safe_date = html.escape(event_date)
    await _send(
        to_email=to_email,
        subject=f"Registration confirmed: {event_title}",
        html_body=f"""
            <h2>You're registered!</h2>
            <p>You have successfully registered for <strong>{safe_title}</strong>.</p>
            <p><strong>Date:</strong> {safe_date}</p>
            <p>See you there!</p>
        """,
    )


async def send_otp_code(to_email: str, code: str):
    """Send a one-time sign-in code to the user."""
    await _send(
        to_email=to_email,
        subject=f"Your EventHub sign-in code: {code}",
        html_body=f"""
            <h2>Your EventHub sign-in code</h2>
            <p>Use this code to finish signing in. It expires in 10 minutes.</p>
            <p style="font-size: 28px; letter-spacing: 0.4em; font-family: 'DM Mono', ui-monospace, Menlo, monospace; font-weight: 700; color: #8b0000; padding: 16px 24px; background: #f5f5f5; border-radius: 8px; display: inline-block;">{html.escape(code)}</p>
            <p style="color: #666; font-size: 12px;">If you didn&apos;t request this, you can safely ignore this email.</p>
        """,
    )


async def send_cancellation_notice(to_email: str, event_title: str):
    """Notify a student that an event they registered for was cancelled."""
    safe_title = html.escape(event_title)
    await _send(
        to_email=to_email,
        subject=f"Event cancelled: {event_title}",
        html_body=f"""
            <h2>Event Cancelled</h2>
            <p>Unfortunately, <strong>{safe_title}</strong> has been cancelled.</p>
            <p>Your registration has been removed automatically.</p>
        """,
    )
