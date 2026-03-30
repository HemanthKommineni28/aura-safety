const BRAND_COLOR = '#4f46e5';
const SOS_COLOR = '#ef4444';
const SUCCESS_COLOR = '#10b981';

const emailWrapper = (content, titleIcon = '🛡️', title = 'Aura Safety') => `
<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <!-- Title Card Banner -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px 20px; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px; margin-bottom: 20px;">
                <span style="font-size: 40px;">${titleIcon}</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">${title}</h1>
            <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Security Network Protocol</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px; text-align: center;">
            ${content}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 500;">
                Sent via <strong>Aura Safety</strong> automated alerting systems.<br>
                For emergency assistance, please contact local authorities immediately.
            </p>
            <div style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Aura Safety Systems Global.
            </div>
        </div>
    </div>
</div>
`;

const templates = {
    otp: (username, otp, reason = 'verification') => emailWrapper(`
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Identity Verification</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello <strong>${username}</strong>,<br>
            Please use the secure access code below to finalize your ${reason}.
        </p>
        <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 25px; margin-bottom: 30px;">
            <span style="font-size: 48px; font-weight: 900; color: #1e293b; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            This security code is sensitive and will expire in 10 minutes.<br>
            <strong>Do not share this code with anyone.</strong>
        </p>
    `, '🔐'),

    sos: (username, lat, lng, type, time) => emailWrapper(`
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 16px; padding: 25px; margin-bottom: 30px; text-align: center;">
            <span style="font-size: 14px; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 10px;">Security Breach Alert</span>
            <h2 style="color: #991b1b; margin: 0; font-size: 24px; font-weight: 800;">${username.toUpperCase()} IS IN DANGER</h2>
        </div>
        
        <div style="text-align: left; background-color: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
            <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Emergency Type</span>
                <span style="color: #ef4444; font-size: 13px; font-weight: 800; text-transform: uppercase;">${type || 'GENERAL'}</span>
            </div>
            <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Transmission Time</span>
                <span style="color: #0f172a; font-size: 13px; font-weight: 700;">${time}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Last Known Coordinates</span>
                <span style="color: #0f172a; font-size: 14px; font-weight: 700; font-family: monospace;">${lat}, ${lng}</span>
            </div>
        </div>

        <a href="https://maps.google.com/?q=${lat},${lng}" style="display: block; background-color: #ef4444; color: white; padding: 20px; text-decoration: none; border-radius: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 16px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">Track Live Location</a>
        
        <p style="color: #64748b; font-size: 13px; margin-top: 25px; line-height: 1.6;">
            The Aura Safety network is currently monitoring this signal.<br>
            Please engage local emergency responders immediately.
        </p>
    `, '🚨', 'SOS Alert'),

    adminRequest: (username, email, approvalLink, rejectionLink) => emailWrapper(`
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Officer Clearance Request</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            A new registration for <strong>Administrator privileges</strong> requires your immediate manual override.
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 30px; text-align: left;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 12px; font-weight: 600;">OFFICER NAME:</span>
                <span style="color: #0f172a; font-size: 12px; font-weight: 700;">${username}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 12px; font-weight: 600;">EMAIL ORIGIN:</span>
                <span style="color: #0f172a; font-size: 12px; font-weight: 700;">${email}</span>
            </div>
        </div>

        <div style="margin-top: 30px;">
            <a href="${approvalLink}" style="display: block; background-color: #10b981; color: white; padding: 18px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; margin-bottom: 15px; text-transform: uppercase;">Grant Clearance</a>
            <a href="${rejectionLink}" style="display: block; background-color: #ef4444; color: white; padding: 18px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; text-transform: uppercase;">Deny Entry & Purge</a>
        </div>
    `, '🛡️', 'Command Center'),

    adminApproved: (username) => emailWrapper(`
        <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 16px; padding: 25px; margin-bottom: 30px; text-align: center;">
            <span style="font-size: 48px; margin-bottom: 15px; display: block;">✅</span>
            <h2 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 800;">Clearance Approved</h2>
        </div>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello <strong>${username}</strong>,<br>
            Your request for Command Center access has been reviewed and <strong>approved</strong>. You are now authorized to monitor the security network.
        </p>
        <a href="http://localhost:5173/admin.html" style="display: block; background-color: #0f172a; color: white; padding: 20px; text-decoration: none; border-radius: 16px; font-weight: 800; text-transform: uppercase;">Launch Admin Console</a>
    `, '🛡️'),

    adminRejected: (username) => emailWrapper(`
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 16px; padding: 25px; margin-bottom: 30px; text-align: center;">
            <span style="font-size: 48px; margin-bottom: 15px; display: block;">❌</span>
            <h2 style="color: #991b1b; margin: 0; font-size: 24px; font-weight: 800;">Entry Denied</h2>
        </div>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello <strong>${username}</strong>,<br>
            Your request for administrator privileges has been <strong>denied</strong> by the High Command. Your access token has been revoked and all temporary data purged.
        </p>
    `, '🛡️')
};

module.exports = templates;
