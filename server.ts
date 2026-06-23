import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser constraints for base64 attached screenshots of payment slips
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API REST: Server-side Order creation with collision-checking & transaction logic
  app.post("/api/create-order", async (req, res) => {
    try {
      const data = req.body;
      if (!data || !data.items || data.items.length === 0) {
        return res.status(400).json({ success: false, error: "Missing items payload." });
      }

      // Initialize firebase if not done already
      let firestoreDb;
      try {
        const { initializeApp: initFbApp, getApp, getApps } = await import("firebase/app");
        const { getFirestore: getFbFirestore } = await import("firebase/firestore");
        
        let app;
        if (getApps().length === 0) {
          const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
          app = initFbApp(firebaseConfig);
        } else {
          app = getApp();
        }
        firestoreDb = getFbFirestore(app);
      } catch (fbErr) {
        console.error("Firebase SDK init failed inside server.ts:", fbErr);
      }

      let orderId = "";
      let isUnique = false;
      let attempts = 0;

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      // If Firestore is available, query collision checking
      if (firestoreDb) {
        const { doc, getDoc } = await import("firebase/firestore");
        while (!isUnique && attempts < 10) {
          attempts++;
          let randStr = '';
          for (let i = 0; i < 6; i++) {
            randStr += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const checkId = `PT-${randStr}`;
          
          const docRef = doc(firestoreDb, "orders", checkId);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            orderId = checkId;
            isUnique = true;
          }
        }
      } else {
        // Fallback for offline/no-db mode
        let randStr = '';
        for (let i = 0; i < 6; i++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        orderId = `PT-${randStr}`;
      }

      if (!orderId) {
        return res.status(500).json({ success: false, error: "Failed to generate a unique order ID." });
      }

      const now = new Date().toISOString();
      const newOrderData = {
        id: orderId,
        order_id: orderId,
        orderId: orderId,
        customer_name: data.customer_name || data.researcherName || "Researcher",
        customer_email: data.customer_email || data.researcherEmail || "",
        customer_phone: data.customer_phone || data.researcherMobile || "",
        delivery_mode: data.delivery_mode || data.deliveryOption || "lalamove",
        shipping_address: data.shipping_address || data.deliveryAddress || "",
        payment_method: data.payment_method || "GCash",
        payment_proof_url: data.payment_proof_url || "",
        subtotal: Number(data.subtotal) || 0,
        shipping_fee: Number(data.shipping_fee) || Number(data.deliveryFee) || 0,
        total_amount: Number(data.total_amount) || Number(data.totalAmount) || 0,
        status: "Pending",
        created_at: now,
        updated_at: now,
        createdAt: now,
        updatedAt: now,
        items: data.items,
        statusHistory: [
          {
            id: `hist-${Math.random().toString(36).substring(2, 7)}`,
            order_id: orderId,
            status: "Pending",
            updated_by: "system",
            created_at: now
          }
        ],
        receiptFileName: data.receiptFileName || "",
        receiptFileDataUrl: data.receiptFileDataUrl || ""
      };

      // Write dynamically if Firestore is connected
      if (firestoreDb) {
        const { doc, writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(firestoreDb);

        // Order document
        const orderRef = doc(firestoreDb, "orders", orderId);
        batch.set(orderRef, newOrderData);

        // Items subcollection
        const items = data.items || [];
        items.forEach((item: any, idx: number) => {
          const itemId = `item_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          const itemRef = doc(firestoreDb, "orders", orderId, "order_items", itemId);
          batch.set(itemRef, {
            id: itemId,
            order_id: orderId,
            product_id: String(item.id || item.product_id),
            product_name: item.name || item.product_name,
            quantity: Number(item.qty || item.quantity) || 1,
            price: Number(item.price) || 0,
            subtotal: (Number(item.price) || 0) * (Number(item.qty || item.quantity) || 1)
          });
        });

        // History subcollection
        const historyId = `hist_${Math.random().toString(36).substring(2, 8)}`;
        const historyRef = doc(firestoreDb, "orders", orderId, "order_status_history", historyId);
        batch.set(historyRef, {
          id: historyId,
          order_id: orderId,
          status: "Pending",
          updated_by: "system",
          created_at: now
        });

        await batch.commit();
        console.log(`[server.ts] Created order ${orderId} in Firestore with subcollections.`);
      }

      res.json({ success: true, orderId, order: newOrderData });
    } catch (err: any) {
      console.error("Failed to create order server-side:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to create order." });
    }
  });

  // API REST: Server-side unique ID generation with collision checking
  app.get("/api/generate-id", async (req, res) => {
    try {
      let firestoreDb;
      try {
        const { initializeApp: initFbApp, getApp, getApps } = await import("firebase/app");
        const { getFirestore: getFbFirestore } = await import("firebase/firestore");
        
        let app;
        if (getApps().length === 0) {
          const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
          app = initFbApp(firebaseConfig);
        } else {
          app = getApp();
        }
        firestoreDb = getFbFirestore(app);
      } catch (fbErr) {
        console.error("Firebase SDK init failed inside server.ts:", fbErr);
      }

      let orderId = "";
      let isUnique = false;
      let attempts = 0;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      if (firestoreDb) {
        const { doc, getDoc } = await import("firebase/firestore");
        while (!isUnique && attempts < 15) {
          attempts++;
          let randStr = '';
          for (let i = 0; i < 6; i++) {
            randStr += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const checkId = `PT-${randStr}`;
          
          const docRef = doc(firestoreDb, "orders", checkId);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            orderId = checkId;
            isUnique = true;
          }
        }
      } else {
        let randStr = '';
        for (let i = 0; i < 6; i++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        orderId = `PT-${randStr}`;
      }

      if (!orderId) {
        return res.status(500).json({ success: false, error: "Failed to generate unique Order ID." });
      }

      res.json({ success: true, orderId });
    } catch (err: any) {
      console.error("Failed to generate order ID:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

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
      const trackingUrl = `${protocol}://${host}/track-order?id=${orderId}`;

      // Build visually elegant laboratory transaction invoice message (Primary theme blue)
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 24px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">DOSE OF FOREVER</h1>
            <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Reservation Confirmation</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong style="color: #0f172a;">${researcherName}</strong> 💙,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">Thank you for your order!</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0;">We've received your order and our team is currently reviewing it. Review your order details below:</p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 13px; margin: 0 0 14px 0; color: #01579b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 35%; font-weight: 600; text-transform: uppercase; font-size: 11px;">Order ID:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #2563eb; font-size: 14px;">${orderId}</td>
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
                <td style="padding: 6px 0; color: #0284c7; font-weight: 700;">Pending Confirmation</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Reserved Research Assays</h3>
          <div style="margin-bottom: 24px;">
            <div style="white-space: pre-line; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.5; color: #0f172a; background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">${itemsStr}</div>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #475569;">Subtotal Reserved:</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">₱${subtotal.toLocaleString()} PHP</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #475569;">Courier Delivery Fee:</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; font-weight: 500;">₱${deliveryFee.toLocaleString()} PHP</td>
              </tr>
              <tr style="border-top: 2px dashed #93c5fd;">
                <td style="padding: 10px 0 0 0; font-weight: 800; color: #2563eb; font-size: 15px;">TOTAL AMOUNT PAID:</td>
                <td style="padding: 10px 0 0 0; text-align: right; font-weight: 800; color: #2563eb; font-size: 16px;">₱${totalAmount.toLocaleString()} PHP</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 28px;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">You can track your order anytime using your Order ID.</p>
            <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 36px; border-radius: 30px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">Track My Order</a>
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
        from: `"Dose of Forever Alerts" <${smtpUser}>`,
        to: "Pankaj.ydv707@gmail.com",
        subject: `🚨 [NEW ORDER] ID: ${orderId} - By: ${researcherName}`,
        text: `New research reservation ID: ${orderId}. Researcher: ${researcherName}, Mobile: ${researcherMobile}, Email: ${researcherEmail}. Total: ₱${totalAmount.toLocaleString()}. Address: ${deliveryAddress}.`,
        html: htmlBody,
        attachments
      };

      // Mail to research customer
      const mailOptionsCustomer = {
        from: `"Dose of Forever Support" <${smtpUser}>`,
        to: researcherEmail,
        subject: `🔬 Dose of Forever Reservation Confirmed - Ref: ${orderId}`,
        text: `Your Dose of Forever reservation request has been validated. ID: ${orderId}. Total: ₱${totalAmount.toLocaleString()}. Thank you for choosing Dose of Forever.`,
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
      const trackingUrl = `${protocol}://${host}/track-order?id=${orderId}`;

      // Determine contents and formatting
      let subject = "";
      let textBody = "";
      let htmlBody = "";

      if (status === "Confirmed") {
        subject = "Your Order Has Been Confirmed";
        textBody = `Hi ${customerName},\n\nGood news! Your order has been confirmed.\n\nOrder ID:\n${orderId}\n\nCurrent Status:\nConfirmed`;
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 24px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">DOSE OF FOREVER</h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Order Confirmation Update</p>
            </div>
            <div style="margin-bottom: 24px;">
              <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Good news! Your order has been confirmed.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Order ID:</p>
                <p style="margin: 4px 0 12px 0; font-size: 16px; font-weight: 700; color: #2563eb; font-family: monospace;">${orderId}</p>
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Current Status:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #2563eb;">Confirmed</p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">We are preparing your materials for dispatch. You can track your order status in real time by clicking the button below.</p>
              <div style="text-align: center;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 32px; border-radius: 30px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">Track My Order</a>
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
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 24px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">DOSE OF FOREVER</h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Order Shipment Notification</p>
            </div>
            <div style="margin-bottom: 24px;">
              <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Your order is now on the way.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Order ID:</p>
                <p style="margin: 4px 0 12px 0; font-size: 16px; font-weight: 700; color: #2563eb; font-family: monospace;">${orderId}</p>
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
      } else if (status === "Delivered") {
        subject = "Your Order Has Been Delivered 🎉";
        textBody = `Hi ${customerName},\n\nGood news! Your order has been delivered.\n\nOrder ID:\n${orderId}\n\nCurrent Status:\nDelivered`;
        htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 24px; margin-bottom: 24px;">
              <h1 style="color: #10b981; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">DOSE OF FOREVER</h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Delivery Confirmation</p>
            </div>
            <div style="margin-bottom: 24px;">
              <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong>${customerName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Your package has been successfully delivered to your specified laboratory address.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Order ID:</p>
                <p style="margin: 4px 0 12px 0; font-size: 16px; font-weight: 700; color: #10b981; font-family: monospace;">${orderId}</p>
                <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Current Status:</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #10b981;">Delivered</p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">Thank you for shopping with us. You can view the order timeline in your tracking dashboard.</p>
              <div style="text-align: center;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 32px; border-radius: 30px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.255);">Track Order Details</a>
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
        htmlBody = `<div>Hi ${customerName},<br/><br/>Your Dose of Forever order status for <b>${orderId}</b> was updated to <b>Pending</b>.</div>`;
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
        from: `"Dose of Forever Support" <${smtpUser}>`,
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

  // REST API: Consultation Notification Service
  app.post("/api/send-consultation-email", async (req, res) => {
    try {
      const {
        consultationId,
        fullName,
        mobileNumber,
        email,
        medicalConcern,
        answers, // { sex, age, height, weight, bmi, bmiCategory, conditions, medications, allergies, goal, exercise, sleep, diet }
        recommendedPeptides, // array of strings
        receiptFileName,
        receiptFileDataUrl,
        prescriptionFileName,
        prescriptionFileDataUrl
      } = req.body;

      if (!consultationId || !fullName || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing mandatory consultation attributes."
        });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // Format answers as HTML table
      const answersHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sex:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.sex || "N/A"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Age:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.age || "N/A"} yrs</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Height:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.height || "N/A"} cm</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Weight:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.weight || "N/A"} kg</td></tr>
          <tr style="border-bottom: 2px solid #e2e8f0;"><td style="padding: 6px 0; color: #0d9488; font-weight: 700;">BMI:</td><td style="padding: 6px 0; color: #0d9488; font-weight: 750;">${answers?.bmi || "N/A"} (${answers?.bmiCategory || "N/A"})</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Medical Conditions:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.conditions && answers.conditions.length > 0 ? answers.conditions.join(", ") : "None"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Current Medications:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.medications || "None"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Allergies:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.allergies || "None"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Primary Goal:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${answers?.goal || "N/A"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Exercise Schedule:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.exercise || "N/A"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sleep Window:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.sleep || "N/A"}</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Intake Diet Type:</td><td style="padding: 6px 0; color: #1e293b;">${answers?.diet || "N/A"}</td></tr>
        </table>
       `;

       const htmlBody = `
         <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
           <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 24px; margin-bottom: 24px;">
             <h1 style="color: #0d9488; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">DOSE OF FOREVER</h1>
             <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Peptide Consultation Request</p>
           </div>
           
           <div style="margin-bottom: 24px;">
             <p style="font-size: 16px; line-height: 1.5; margin: 0 0 12px 0;">Hi <strong style="color: #0f172a;">${fullName}</strong> 🩺,</p>
             <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">We have received your Peptide Consultation Request!</p>
             <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0;">Our clinical review board will screen your bio-assessment profile shortly. Review your consultation profile, quiz metrics, and status overview below:</p>
           </div>

           <div style="background-color: #f0fdfa; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #ccfbf1;">
             <h3 style="font-size: 13px; margin: 0 0 14px 0; color: #0f766e; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; border-bottom: 1px solid #ccfbf1; padding-bottom: 6px;">Consultation Metadata</h3>
             <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
               <tr>
                 <td style="padding: 6px 0; color: #0f766e; width: 35%; font-weight: 600; text-transform: uppercase; font-size: 11px;">Consultation ID:</td>
                 <td style="padding: 6px 0; font-weight: 700; color: #0d9488; font-size: 14px;">${consultationId}</td>
               </tr>
               <tr>
                 <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Contact Mobile:</td>
                 <td style="padding: 6px 0; color: #334155;">${mobileNumber}</td>
               </tr>
               <tr>
                 <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Patient Email:</td>
                 <td style="padding: 6px 0; color: #334155; font-weight: 500;">${email}</td>
               </tr>
               <tr>
                 <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Medical Concerns:</td>
                 <td style="padding: 6px 0; color: #334155;">${medicalConcern || "None provided"}</td>
               </tr>
               <tr>
                 <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Consultation Cost:</td>
                 <td style="padding: 6px 0; color: #0d9488; font-weight: 700;">₱500 PHP</td>
               </tr>
               <tr>
                 <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Clinical Status:</td>
                 <td style="padding: 6px 0; color: #d97706; font-weight: 700;">Paid (Under Review)</td>
               </tr>
             </table>
           </div>

           <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Patient Intake Answers</h3>
           <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
             ${answersHtml}
           </div>

           <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Matched Research Peptides</h3>
           <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-weight: 600; color: #0d9488; font-size: 13px;">
             ${recommendedPeptides && recommendedPeptides.length > 0 ? recommendedPeptides.join(", ") : "None suggested"}
           </div>

           <div style="font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
             <p style="margin: 0 0 6px 0; font-weight: bold; text-transform: uppercase; color: #475569;">LABORATORY COMPLIANCE MANDATE & MEDICAL DISCLAIMER</p>
             <p style="margin: 0;">These chemical coordinates are distributed solely under local research frameworks for in-vitro laboratory assays and scientific investigations. Physical consultations help match clinical guidelines with required assay parameters. Thank you for your partnership.</p>
           </div>
         </div>
       `;

       const attachments: any[] = [];
       if (receiptFileDataUrl && receiptFileDataUrl.includes("base64,")) {
         try {
           const parts = receiptFileDataUrl.split("base64,");
           const mimePart = parts[0].match(/data:(.*?);/);
           const mimeType = mimePart ? mimePart[1] : "image/png";
           const rawBase64 = parts[1];
           attachments.push({
             filename: receiptFileName || "gcash_consultation_receipt.png",
             content: Buffer.from(rawBase64, "base64"),
             contentType: mimeType
           });
         } catch (err) {
           console.error("Failed to parse consultation receipt base64 data:", err);
         }
       }

       if (prescriptionFileDataUrl && prescriptionFileDataUrl.includes("base64,")) {
         try {
           const parts = prescriptionFileDataUrl.split("base64,");
           const mimePart = parts[0].match(/data:(.*?);/);
           const mimeType = mimePart ? mimePart[1] : "application/pdf";
           const rawBase64 = parts[1];
           attachments.push({
             filename: prescriptionFileName || "prescription_medical_document.pdf",
             content: Buffer.from(rawBase64, "base64"),
             contentType: mimeType
           });
         } catch (err) {
           console.error("Failed to parse prescription base64 data:", err);
         }
       }

       if (!smtpUser || !smtpPass) {
         console.warn("SMTP credentials are not configured (SMTP_USER/SMTP_PASS). Printed Consultation details to server terminal.");
         console.log(`[Consultation Request Review ID: ${consultationId}]
 ---------------------------------
 Merchant Alert Sent To: Pankaj.ydv707@gmail.com
 Patient Notification Sent To: ${email}
 Name: ${fullName}
 Mobile: ${mobileNumber}
 Email: ${email}
 BMI: ${answers?.bmi || "N/A"} (${answers?.bmiCategory || "N/A"})
 Recommended Peptides: ${recommendedPeptides ? recommendedPeptides.join(", ") : ""}
 GCash Receipt File: ${receiptFileName || "no_file.png"}
 Prescription File: ${prescriptionFileName || "none_provided"}
 Medical Concern: ${medicalConcern || "none"}
 ---------------------------------`);

         return res.json({
           success: true,
           mocked: true,
           message: "Consultation Request received! SMTP is mocked. Saved to cloud database successfully."
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

       const mailOptionsAdmin = {
         from: `"Dose Of Forever Consultation Alerts" <${smtpUser}>`,
         to: "Pankaj.ydv707@gmail.com",
         subject: `🚨 [NEW CONSULTATION] Ref: ${consultationId} - By: ${fullName}`,
         text: `Consultation request ID: ${consultationId} received. Patient: ${fullName}, Mobile: ${mobileNumber}, Email: ${email}. Medical concern: ${medicalConcern}. Recommended: ${recommendedPeptides ? recommendedPeptides.join(", ") : ""}.`,
         html: htmlBody,
         attachments
       };

       const mailOptionsUser = {
         from: `"Dose of Forever Support" <${smtpUser}>`,
         to: email,
         subject: "Your Peptide Consultation Request Received",
         text: `Your Dose of Forever consultation has been recorded successfully. Ref No: ${consultationId}. Our team will review your file shortly.`,
         html: htmlBody,
         attachments
       };

       await Promise.all([
         transporter.sendMail(mailOptionsAdmin),
         transporter.sendMail(mailOptionsUser)
       ]);

       res.json({
         success: true,
         message: "Consultation email updates broadcasted successfully."
       });
     } catch (err: any) {
       console.error("Consultation email SMTP failure: ", err);
       res.status(500).json({
         success: false,
         error: err.message || "Email dispatch failed."
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
