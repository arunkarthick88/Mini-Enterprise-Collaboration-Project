import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe
import database, auth, models
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

router = APIRouter(prefix="/billing", tags=["SaaS Billing"])

# Dynamically grab credentials from the environment
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
SILVER_PRICE_ID = os.getenv("STRIPE_SILVER_PRICE_ID")
GOLD_PRICE_ID = os.getenv("STRIPE_GOLD_PRICE_ID")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

PLANS = {
    "silver": {"price_id": SILVER_PRICE_ID, "name": "Silver", "credits": 500},
    "gold": {"price_id": GOLD_PRICE_ID, "name": "Gold", "credits": 5000}
}

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan_type: str, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.role_required(["admin"]))
):
    """Generates a Stripe Checkout URL for the selected SaaS plan."""
    
    if plan_type not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid premium plan selected.")

    price_id = PLANS[plan_type]["price_id"]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Stripe Price ID for {plan_type} is not configured in .env")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='http://localhost:5173/dashboard?success=true',
            cancel_url='http://localhost:5173/dashboard?canceled=true',
            client_reference_id=str(current_user.organization_id),
            metadata={"plan_type": plan_type}
        )
        return {"checkout_url": checkout_session.url}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(database.get_db)):
    """Stripe calls this endpoint automatically when a payment succeeds."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret is not configured in .env")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Webhook signature verification failed.")

    # Handle the successful subscription
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # --- FIX: Safe attribute access for Stripe objects ---
        org_id = getattr(session, 'client_reference_id', None)
        stripe_customer_id = getattr(session, 'customer', None)
        
        # Metadata handling
        metadata = getattr(session, 'metadata', {})
        plan_type = metadata.get('plan_type') if isinstance(metadata, dict) else getattr(metadata, 'plan_type', None)

        # Upgrade the Organization in our database!
        if org_id and org_id != "None" and plan_type:
            try:
                org = db.query(models.Organization).filter(models.Organization.id == int(org_id)).first()
                if org:
                    org.subscription_plan = plan_type
                    org.stripe_customer_id = stripe_customer_id
                    
                    # Add AI Credits based on plan selection
                    if plan_type == "silver":
                        org.ai_credits += 500
                    elif plan_type == "gold":
                        org.ai_credits += 5000
                        
                    db.commit()
                    print(f"✅ Organization {org.name} successfully upgraded to {plan_type.upper()}!")
            except Exception as e:
                print(f"❌ Error updating organization: {e}")
                db.rollback()

    return {"status": "success"}