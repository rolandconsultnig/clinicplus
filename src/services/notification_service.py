"""
Notification Service for SMS and Email Reminders
Supports multiple providers: Twilio (SMS), SendGrid/SES (Email)
"""
import os
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict

class NotificationService:
    """Service for sending SMS and Email notifications"""
    
    def __init__(self):
        # SMS Configuration (Twilio)
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER', '')
        
        # Email Configuration (SendGrid)
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY', '')
        self.sendgrid_from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@clinicplus.com')
        
        # Fallback: SMTP Configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
    
    def send_sms(self, phone_number: str, message: str) -> Dict[str, any]:
        """Send SMS via Twilio"""
        try:
            if not self.twilio_account_sid or not self.twilio_auth_token:
                return {'success': False, 'error': 'Twilio not configured'}
            
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json"
            
            payload = {
                'From': self.twilio_phone_number,
                'To': phone_number,
                'Body': message
            }
            
            response = requests.post(
                url,
                data=payload,
                auth=(self.twilio_account_sid, self.twilio_auth_token)
            )
            
            if response.status_code == 201:
                return {
                    'success': True,
                    'message_sid': response.json().get('sid'),
                    'status': 'sent'
                }
            else:
                return {
                    'success': False,
                    'error': f'Twilio error: {response.text}'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> Dict[str, any]:
        """Send email via SendGrid or SMTP"""
        try:
            # Try SendGrid first
            if self.sendgrid_api_key:
                return self._send_via_sendgrid(to_email, subject, html_content, text_content)
            
            # Fallback to SMTP
            if self.smtp_username and self.smtp_password:
                return self._send_via_smtp(to_email, subject, html_content, text_content)
            
            return {'success': False, 'error': 'Email service not configured'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_via_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: str) -> Dict[str, any]:
        """Send email via SendGrid API"""
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": self.sendgrid_from_email},
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            if text_content:
                payload["content"].append({
                    "type": "text/plain",
                    "value": text_content
                })
            
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 202:
                return {'success': True, 'status': 'sent'}
            else:
                return {'success': False, 'error': f'SendGrid error: {response.text}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_via_smtp(self, to_email: str, subject: str, html_content: str, text_content: str) -> Dict[str, any]:
        """Send email via SMTP"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            return {'success': True, 'status': 'sent'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_appointment_reminder(self, appointment, patient) -> Dict[str, any]:
        """Send appointment reminder via SMS and/or Email"""
        results = {'sms': None, 'email': None}
        
        # Format appointment details
        appointment_date = appointment.appointment_date.strftime('%B %d, %Y')
        appointment_time = appointment.appointment_time.strftime('%I:%M %p')
        
        message = f"Reminder: You have an appointment on {appointment_date} at {appointment_time}. Please arrive 15 minutes early."
        
        # Send SMS if phone number available
        if patient.phone_primary:
            results['sms'] = self.send_sms(patient.phone_primary, message)
        
        # Send Email if email available
        if patient.email:
            html_content = f"""
            <html>
                <body>
                    <h2>Appointment Reminder</h2>
                    <p>Dear {patient.first_name},</p>
                    <p>This is a reminder that you have an appointment scheduled:</p>
                    <ul>
                        <li><strong>Date:</strong> {appointment_date}</li>
                        <li><strong>Time:</strong> {appointment_time}</li>
                        <li><strong>Type:</strong> {appointment.appointment_type}</li>
                    </ul>
                    <p>Please arrive 15 minutes early for check-in.</p>
                    <p>If you need to reschedule, please contact us.</p>
                </body>
            </html>
            """
            
            text_content = f"Appointment Reminder\n\nDate: {appointment_date}\nTime: {appointment_time}\nType: {appointment.appointment_type}\n\nPlease arrive 15 minutes early."
            
            results['email'] = self.send_email(
                patient.email,
                'Appointment Reminder - Clinic+',
                html_content,
                text_content
            )
        
        return results

# Singleton instance
notification_service = NotificationService()

