(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/resend-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'PT-TEST01' })
    });
    const text = await res.text();
    console.log('status:', res.status);
    console.log('body:', text);
  } catch (err) {
    console.error('resend error', err);
  }
})();
