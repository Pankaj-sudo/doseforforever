(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/resend-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'PT-TEST01' })
    });
    const data = await res.text();
    console.log('resend response:', data);
  } catch (err) {
    console.error('resend error', err);
  }
})();
