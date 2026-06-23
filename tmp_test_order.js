(async () => {
  try {
    const orderPayload = {
      items: [{ id: 1, name: "Test Product", qty: 2, price: 150 }],
      customer_name: "QA Tester",
      researcherEmail: "qa@example.com",
      researcherName: "QA Tester",
      researcherMobile: "09171234567",
      subtotal: 300,
      shipping_fee: 50,
      total_amount: 350
    };

    const createResp = await fetch('http://localhost:3000/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const createData = await createResp.json();
    console.log('create-order response:', createData);

    if (!createData || !createData.success) {
      console.error('Create order failed, aborting email send');
      process.exit(1);
    }

    const orderId = createData.orderId || (createData.order && createData.order.orderId);
    const emailResp = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        researcherName: 'QA Tester',
        researcherMobile: '09171234567',
        researcherEmail: 'qa@example.com',
        itemsStr: '• Test Product (10mg) × 2 - ₱300',
        subtotal: 300,
        deliveryOption: 'lalamove',
        deliveryFee: 50,
        totalAmount: 350,
        deliveryAddress: '123 Test St',
        receiptFileName: 'receipt.png',
        receiptFileDataUrl: ''
      })
    });

    const emailData = await emailResp.json();
    console.log('send-email response:', emailData);

  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
})();
