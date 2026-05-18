# backend/services/email.py
#
# Email sending via Resend SDK.
# The Resend SDK is synchronous, so we use asyncio.to_thread()
# to run it in a thread pool and not block the async event loop.

import asyncio
import resend

from core.config import settings

resend.api_key = settings.resend_api_key


async def send_registration_confirmation(to_email: str, event_title: str, event_date: str):
    """Send confirmation email after student registers for an event."""
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": "EventHub <noreply@yourdomain.com>",
            "to": to_email,
            "subject": f"Registration confirmed: {event_title}",
            "html": f"""
                <h2>You're registered!</h2>
                <p>You have successfully registered for <strong>{event_title}</strong>.</p>
                <p><strong>Date:</strong> {event_date}</p>
                <p>See you there!</p>
            """,
        },
    )


async def send_cancellation_notice(to_email: str, event_title: str):
    """Notify student that an event they registered for was cancelled."""
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": "EventHub <noreply@yourdomain.com>",
            "to": to_email,
            "subject": f"Event cancelled: {event_title}",
            "html": f"""
                <h2>Event Cancelled</h2>
                <p>Unfortunately, <strong>{event_title}</strong> has been cancelled.</p>
                <p>Your registration has been removed automatically.</p>
            """,
        },
    )
