# backend/services/email.py
#
# Email sending via Resend SDK.
# The Resend SDK is synchronous, so we use asyncio.to_thread()
# to run it in a thread pool and not block the async event loop.

import asyncio
import html
import resend

from core.config import settings

resend.api_key = settings.resend_api_key


async def send_registration_confirmation(to_email: str, event_title: str, event_date: str):
    """Send confirmation email after student registers for an event."""
    safe_title = html.escape(event_title)
    safe_date = html.escape(event_date)
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": settings.email_from,
            "to": to_email,
            "subject": f"Registration confirmed: {event_title}",
            "html": f"""
                <h2>You're registered!</h2>
                <p>You have successfully registered for <strong>{safe_title}</strong>.</p>
                <p><strong>Date:</strong> {safe_date}</p>
                <p>See you there!</p>
            """,
        },
    )


async def send_cancellation_notice(to_email: str, event_title: str):
    """Notify student that an event they registered for was cancelled."""
    safe_title = html.escape(event_title)
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": settings.email_from,
            "to": to_email,
            "subject": f"Event cancelled: {event_title}",
            "html": f"""
                <h2>Event Cancelled</h2>
                <p>Unfortunately, <strong>{safe_title}</strong> has been cancelled.</p>
                <p>Your registration has been removed automatically.</p>
            """,
        },
    )
