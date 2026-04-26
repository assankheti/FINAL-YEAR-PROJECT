# src/app/services/stytch_client.py
import os
import stytch
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
STYTCH_PROJECT_ID = os.getenv("STYTCH_PROJECT_ID")
STYTCH_SECRET = os.getenv("STYTCH_SECRET")
STYTCH_ENV = os.getenv("STYTCH_ENV", "test")  # "test" or "live"

# Initialize Stytch client (official SDK)
_client = stytch.Client(project_id=STYTCH_PROJECT_ID, secret=STYTCH_SECRET)


def get_client() -> stytch.Client:
    """Return the Stytch client instance."""
    if STYTCH_PROJECT_ID is None or STYTCH_SECRET is None:
        raise RuntimeError("STYTCH_PROJECT_ID and STYTCH_SECRET must be set")
    return _client


def send_otp_sms(phone_number: str, expiration_minutes: int = 5) -> dict:
    """
    Send an OTP to the given phone number via SMS.
    Returns the response dictionary from Stytch.
    """
    client = get_client()
    res = client.otps.sms.send(
        phone_number=phone_number, expiration_minutes=expiration_minutes
    )
    return res


def authenticate_otp(method_id: str, code: str) -> dict:
    """
    Authenticate a phone OTP with Stytch using method_id and code.
    Returns the response dictionary from Stytch.
    """
    client = get_client()
    res = client.otps.authenticate(method_id=method_id, code=code)
    return res
