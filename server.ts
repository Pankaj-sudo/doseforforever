import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser constraints for base64 attached screenshots of payment slips
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API REST: Receipt Dispatch & Order Notification Service
  app.post("/api/send-email", async (req, res) => {
    try {
      const {
        orderId,
        researcherName,
        researcherMobile,
        researcherEmail,
        itemsStr,
        subtotal,
        deliveryOption,
        deliveryFee,
        totalAmount,
        deliveryAddress,
        receiptFileName,
        receiptFileDataUrl
      } = req.body;

      if (!orderId || !researcherName || !researcherEmail) {
        return res.status(400).json({
          success: false,
          error: "Missing mandatory checkout attributes."
        });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // Gracefully handle missing credentials by notifying the client UI
      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials are not configured in system environment variables (SMTP_USER/SMTP_PASS). Order email was printed to system logs.");
        console.log(`[Order Pending Verification ID: ${orderId}]
---------------------------------
Merchant Alert Sent To: Pankaj.ydv707@gmail.com
Customer Notification Sent To: ${researcherEmail}
Name: ${researcherName}
Phone: ${researcherMobile}
Subtotal: ₱${subtotal.toLocaleString()} PHP
Courier Delivery: ${deliveryOption.toUpperCase()} (₱${deliveryFee.toLocaleString()} PHP)
Total: ₱${totalAmount.toLocaleString()} PHP
Address: ${deliveryAddress}
Receipt Attached Name: ${receiptFileName || "no_file.png"}
---------------------------------`);

        return res.json({
          success: true,
          mocked: true,
          message: "Order received! Note: To dispatch real emails, please set your SMTP_USER and SMTP_PASS variables in the Settings panel."
        });
      }

      // Initialize the SMTP Mailer
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      // Get origin for tracking link
      const host = req.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const trackingUrl = `${protocol}://${host}/track-order?orderId=${orderId}`;

      // Build visually elegant laboratory transaction invoice message (Primary theme blue)
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; border-bottom: 2px solid #7a223e; padding-bottom: 24px; margin-bottom: 24px;">
            <h1 style="color: #7a223e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">PEPTALK.PH</h1>
            <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Reservation Confirmation</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong style="color: #0f172a;">${researcherName}</strong> 💙,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">Thank you for your order!</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0;">We've received your order and our team is currently reviewing it. Review your order details below:</p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 13px; margin: 0 0 14px 0; color: #7a223e; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 35%; font-weight: 600; text-transform: uppercase; font-size: 11px;">Order ID:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #7a223e; font-size: 14px;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Researcher Email:</td>
                <td style="padding: 6px 0; color: #334155; font-weight: 500;">${researcherEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Mobile Contact:</td>
                <td style="padding: 6px 0; color: #334155;">${researcherMobile}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Courier Dispatch:</td>
                <td style="padding: 6px 0; color: #334155; text-transform: uppercase; font-weight: 600;">${deliveryOption}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; vertical-align: top;">Shipping Address:</td>
                <td style="padding: 6px 0; color: #334155; line-height: 1.4;">${deliveryAddress}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Payment Method:</td>
                <td style="padding: 6px 0; color: #334155; font-weight: 600; text-transform: uppercase;">GCASH</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Current Status:</td>
                <td style="padding: 6px 0; color: #7a223e; font-weight: 700;">Pending Confirmation</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Reserved Research Assays</h3>
          <div style="margin-bottom: 24px;">
            <div style="white-space: pre-line; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.5; color: #0f172a; background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">${itemsStr}</div>
          </div>

          <div style="background-color: #fcfaf5; border: 1px solid #ebdce1; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #475569;">Subtotal Reserved:</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">₱${subtotal.toLocaleString()} PHP</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #475569;">Courier Delivery Fee:</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">₱${deliveryFee.toLocaleString()} PHP</td>
              </tr>
              <tr style="border-top: 2px dashed #ebdce1;">
                <td style="padding: 10px 0 0 0; font-weight: 800; color: #7a223e; font-size: 15px;">TOTAL AMOUNT PAID:</td>
                <td style="padding: 10px 0 0 0; text-align: right; font-weight: 800; color: #7a223e; font-size: 16px;">₱${totalAmount.toLocaleString()} PHP</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 28px;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">You can track your order anytime using your Order ID.</p>
            <a href="${trackingUrl}" style="display: inline-block; background-color: #7a223e; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 36px; border-radius: 30px; box-shadow: 0 4px 10px rgba(122, 34, 62, 0.2);">Track My Order</a>
          </div>

          <div style="font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: bold; text-transform: uppercase; color: #475569;">LABORATORY COMPLIANCE MANDATE</p>
            <p style="margin: 0;">These chemical coordinates are distributed solely under local research frameworks for in-vitro laboratory assays and scientific investigations. Not intended for therapeutic consumption. Thank you for shopping with us.</p>
          </div>
        </div>
      `;

      // Embed Base64 screenshot proof as attachment if present
      const attachments = [];
      if (receiptFileDataUrl && receiptFileDataUrl.includes("base64,")) {
        try {
          const parts = receiptFileDataUrl.split("base64,");
          const mimePart = parts[0].match(/data:(.*?);/);
          const mimeType = mimePart ? mimePart[1] : "image/png";
          const rawBase64 = parts[1];
          attachments.push({
            filename: receiptFileName || "payment_proof_receipt.png",
            content: Buffer.from(rawBase64, "base64"),
            contentType: mimeType
          });
        } catch (embedError) {
          console.error("Failed to parse and attach payment proof screenshot file:", embedError);
        }
      }

      // Mail to developer & order administrator
      const mailOptionsMerchant = {
        from: `"peptalk.ph Alerts" <${smtpUser}>`,
        to: "Pankaj.ydv707@gmail.com",
        subject: `🚨 [NEW ORDER] ID: ${orderId} - By: ${researcherName}`,
        text: `New research reservation ID: ${orderId}. Researcher: ${researcherName}, Mobile: ${researcherMobile}, Email: ${researcherEmail}. Total: ₱${totalAmount.toLocaleString()}. Address: ${deliveryAddress}.`,
        html: htmlBody,
        attachments
      };

      // Mail to research customer
      const mailOptionsCustomer = {
        from: `"peptalk.ph Support" <${smtpUser}>`,
        to: researcherEmail,
        subject: `🔬 peptalk.ph Reservation Confirmed - Ref: ${orderId}`,
        text: `Your peptalk.ph reservation request has been validated. ID: ${orderId}. Total: ₱${totalAmount.toLocaleString()}. Thank you for choosing peptalk.ph.`,
        html: htmlBody,
        attachments
      };

      // Disperse emails asynchronously and concurrently
      await Promise.all([
        transporter.sendMail(mailOptionsMerchant),
        transporter.sendMail(mailOptionsCustomer)
      ]);

      res.json({
        success: true,
        message: "Order placed! Reservation notifications sent to both customer and merchant successfully."
      });

    } catch (err: any) {
      console.error("SMTP error occured in transaction endpoint:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to transmit reservation dispatch notice."
      });
    }
  });

  // REST API: Automatic Status Email Notification Dispatcher (Adhering to Section 4)
  app.post("/api/send-status-email", async (req, res) => {
    try {
      const {
        orderId,
        customerName,
        customerEmail,
        status
      } = req.body;

      if (!orderId || !customerName || !customerEmail || !status) {
        return res.status(400).json({
          success: false,
          error: "Missing mandatory status notification attributes."
        });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // Dynamic host fallback for absolute links
      const host = req.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const trackingUrl = `${protocol}://${host}/track-order?orderId=${orderId}`;

      // Determine contents and formatting
      let subject = "";
      let textBody = "";
      let htmlBody = "";

      if (status === "Confirmed") {
        subject = "Your Order Has Been Confirmed";
        textBody = `Hi ${customerName},\n\nGood news! Your order has been confirmed.\n\nOrder ID:\n${orderId}\n\nCurrent Status:\nConfirmed`;
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #7a223e; padding-bottom: 24px; margin-bottom: 24px;">
              <h1 style="color: #7a223e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">PEPTALK.PH</h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Order Confirmation Update</p>
            </div>
            <div style="margin-bottom: 24px;">
              <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Good news! Your order has been confirmed.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Order ID:</p>
                <p style="margin: 4px 0 12px 0; font-size: 16px; font-weight: 700; color: #7a223e; font-family: monospace;">${orderId}</p>
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Current Status:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #7a223e;">Confirmed</p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">We are preparing your materials for dispatch. You can track your order status in real time by clicking the button below.</p>
              <div style="text-align: center;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #7a223e; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 32px; border-radius: 30px; box-shadow: 0 4px 10px rgba(122, 34, 62, 0.25);">Track My Order</a>
              </div>
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; margin-top: 24px;">
              <p style="margin: 0;">These chemical coordinates are distributed solely under local research frameworks for in-vitro laboratory assays and scientific investigations.</p>
            </div>
          </div>
        `;
      } else if (status === "Shipped") {
        subject = "Your Order Has Been Shipped 🚚";
        textBody = `Hi ${customerName},\n\nYour order is now on the way.\n\nOrder ID:\n${orderId}\n\nCurrent Status:\nShipped\n\nTrack your order using the button below.`;
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #7a223e; padding-bottom: 24px; margin-bottom: 24px;">
              <h1 style="color: #7a223e; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">PEPTALK.PH</h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Order Shipment Notification</p>
            </div>
            <div style="margin-bottom: 24px;">
              <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Your order is now on the way.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Order ID:</p>
                <p style="margin: 4px 0 12px 0; font-size: 16px; font-weight: 700; color: #7a223e; font-family: monospace;">${orderId}</p>
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Current Status:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #10b981;">Shipped</p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">Your package is in route with our local courier. Track your shipment progress instantly using the tracking dashboard link below:</p>
              <div style="text-align: center;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 32px; border-radius: 30px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);">Track Order</a>
              </div>
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; margin-top: 24px;">
              <p style="margin: 0;">These chemical coordinates are distributed solely under local research frameworks for in-vitro laboratory assays and scientific investigations.</p>
            </div>
          </div>
        `;
      } else if (status === "Pending") {
        subject = "Your Order is Pending Review";
        textBody = `Hi ${customerName},\n\nYour order state has been set back to Pending.\n\nOrder ID:\n${orderId}`;
        htmlBody = `<div>Hi ${customerName},<br/><br/>Your peptalk.ph order status for <b>${orderId}</b> was updated to <b>Pending</b>.</div>`;
      }

      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials are not configured in system environment variables (SMTP_USER/SMTP_PASS). Status update email was printed to system logs.");
        console.log(`[Status Update Alert - ID: ${orderId}]
---------------------------------
Recipient Notification Sent To: ${customerEmail}
Subject: ${subject}
Message Text:
${textBody}
---------------------------------`);

        return res.json({
          success: true,
          mocked: true,
          message: `Status notification recorded on server logs! Current Status: ${status}`
        });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: `"peptalk.ph Support" <${smtpUser}>`,
        to: customerEmail,
        subject: subject,
        text: textBody,
        html: htmlBody
      };

      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: "Status notification email dispatched to researcher successfully."
      });
    } catch (err: any) {
      console.error("Failed to send status update email:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to dispatch status notice."
      });
    }
  });

  // Explicitly serve the requested static HTML pages from the workspace root if requested
  app.get("/dose-of-forever-static.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "dose-of-forever-static.html"));
  });

  app.get("/youtube-background-hero.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "youtube-background-hero.html"));
  });

  // Serve static assets or mount local Dev Vite mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operative under port ${PORT}`);
  });
}

startServer();
