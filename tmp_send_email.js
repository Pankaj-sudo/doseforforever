(async () => {
  try {
    const body = {
      orderId: 'PT-TEST01',
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
    };

    const res = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('send-email response:', data);
  } catch (err) {
    console.error(err);
  }
})();
